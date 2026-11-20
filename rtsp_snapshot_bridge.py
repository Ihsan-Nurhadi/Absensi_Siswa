"""
RTSP Snapshot Bridge untuk Web Absensi Siswa
--------------------------------------------
Menghubungkan CCTV lokal (Tiandy / Tapo / RTSP IP Camera) dengan VPS Web Absensi
tanpa perlu VPN atau membuka port kamera ke internet.

Cara kerja:
1. Subscribe ke topik MQTT `rfid/ws/display` (format payload: NAMA,STATUS)
2. Saat ada scan berhasil (SUKSES / TERLAMBAT / ABSEN PULANG),
   script langsung mengambil 1 frame JPEG dari RTSP CCTV lokal
3. Mengunggah foto JPEG ke VPS: POST /api/attendance/snapshot-upload/

Kebutuhan library Python:
    pip install paho-mqtt requests opencv-python

(Opsional: jika `ffmpeg` sudah terpasang di sistem, script otomatis memakai `ffmpeg`
karena lebih cepat untuk RTSP; jika tidak ada, otomatis memakai `opencv-python`).

Tes ambil 1 gambar langsung tanpa tap kartu:
    python rtsp_snapshot_bridge.py --test
"""

import argparse
import os
import shutil
import subprocess
import sys
import tempfile
import threading
import time

import paho.mqtt.client as mqtt
import requests
import urllib3

# Matikan warning SSL jika akses VPS lewat IP (https://110.232.92.134:3004)
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# ==========================================================
# KONFIGURASI (SESUAIKAN DENGAN JARINGAN & AKUN ANDA)
# ==========================================================
# 1. URL RTSP CCTV Lokal
#    - Tiandy TCH2 (sub-stream): rtsp://admin:admin1234@192.168.1.105:554/1/2
#    - Tapo C500   (sub-stream): rtsp://USER_KAMERA:PASS_KAMERA@IP_TAPO:554/stream2
# RTSP_URL = "rtsp://NayakaWS:NYK12345@192.168.1.105:554/1/2"
RTSP_URL = "rtsp://admin:admin1234@192.168.1.105:554/1"

# 2. Konfigurasi MQTT Broker (samakan dengan Dashboard Admin & esp32.ino)
MQTT_HOST = "emqx.nayakanms.com"
MQTT_PORT = 1884
MQTT_USER = "nykws"          # isi jika broker pakai username
MQTT_PASS = "ws"          # isi jika broker pakai password
MQTT_TOPIC = "rfid/ws/display"

# 3. Endpoint Upload Foto di VPS
VPS_UPLOAD_URL = "https://110.232.92.134:3004/api/attendance/snapshot-upload/"
DEVICE_API_KEY = "absensi-device-secret-2026"
# ==========================================================

capture_lock = threading.Lock()


def is_success_status(status_text: str) -> bool:
    """Hanya ambil foto saat scan berhasil (HADIR/SUKSES, TERLAMBAT, ABSEN PULANG)."""
    u = (status_text or "").upper()
    if "TIDAK" in u or "SUDAH" in u or "LEWAT" in u:
        return False
    return any(k in u for k in ("SUKSES", "HADIR", "TERLAMBAT", "PULANG"))


def capture_frame_ffmpeg(rtsp_url: str, output_path: str) -> bool:
    """Ambil 1 frame JPEG dari RTSP menggunakan ffmpeg (cepat & bebas buffer lama)."""
    cmd = [
        "ffmpeg",
        "-y",
        "-rtsp_transport", "tcp",
        "-i", rtsp_url,
        "-frames:v", "1",
        "-q:v", "3",
        "-loglevel", "error",
        output_path,
    ]
    res = subprocess.run(cmd, timeout=10, capture_output=True, text=True)
    if res.returncode == 0 and os.path.exists(output_path) and os.path.getsize(output_path) > 0:
        return True
    if res.stderr:
        print(f"[RTSP/FFmpeg] Error: {res.stderr.strip()}")
    return False


def capture_frame_opencv(rtsp_url: str, output_path: str) -> bool:
    """Fallback ambil 1 frame JPEG dari RTSP menggunakan OpenCV (cv2)."""
    try:
        import cv2
    except ImportError:
        print("[RTSP] ffmpeg tidak ditemukan dan opencv-python belum terinstall. Jalankan: pip install opencv-python")
        return False

    os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "rtsp_transport;tcp"
    cap = cv2.VideoCapture(rtsp_url, cv2.CAP_FFMPEG)
    if not cap.isOpened():
        print(f"[RTSP/OpenCV] Gagal membuka stream: {rtsp_url}")
        return False

    # Buang beberapa frame awal agar mendapat gambar terbaru
    ok, frame = False, None
    for _ in range(5):
        ok, frame = cap.read()
    cap.release()

    if not ok or frame is None:
        print("[RTSP/OpenCV] Gagal membaca frame dari CCTV.")
        return False

    cv2.imwrite(output_path, frame, [int(cv2.IMWRITE_JPEG_QUALITY), 85])
    return os.path.exists(output_path) and os.path.getsize(output_path) > 0


def capture_rtsp_snapshot(rtsp_url: str, output_path: str) -> bool:
    """Ambil 1 gambar JPEG dari RTSP CCTV lokal."""
    if shutil.which("ffmpeg"):
        if capture_frame_ffmpeg(rtsp_url, output_path):
            return True
    return capture_frame_opencv(rtsp_url, output_path)


def upload_to_vps(nama: str, status: str, image_path: str):
    """Upload file JPEG snapshot ke backend Django di VPS."""
    try:
        with open(image_path, "rb") as f:
            files = {"image": ("snapshot.jpg", f, "image/jpeg")}
            data = {"nama": nama, "status": status}
            headers = {"X-Device-Key": DEVICE_API_KEY}
            resp = requests.post(
                VPS_UPLOAD_URL,
                data=data,
                files=files,
                headers=headers,
                timeout=10,
                verify=False,
            )
        print(f"[VPS] HTTP {resp.status_code}: {resp.text}")
    except Exception as exc:
        print(f"[VPS] Gagal upload foto: {exc}")


def handle_scan_event(nama: str, status: str):
    """Proses pengambilan snapshot dan upload ke VPS di thread terpisah."""
    if not capture_lock.acquire(blocking=False):
        print(f"[SKIP] Masih memproses kamera untuk scan sebelumnya, lewati {nama}")
        return

    tmp_path = None
    try:
        t0 = time.time()
        with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
            tmp_path = tmp.name

        print(f"[CAM] Mengambil snapshot RTSP untuk {nama} ({status})...")
        if capture_rtsp_snapshot(RTSP_URL, tmp_path):
            size_kb = os.path.getsize(tmp_path) / 1024
            print(f"[CAM] Snapshot OK ({size_kb:.1f} KB) dalam {time.time() - t0:.2f}s")
            upload_to_vps(nama, status, tmp_path)
        else:
            print("[CAM] Gagal mengambil snapshot dari RTSP.")
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)
        capture_lock.release()


def on_connect(client, userdata, flags, rc, properties=None):
    rc_val = getattr(rc, "value", rc)
    if rc_val == 0:
        print(f"[MQTT] Terhubung ke {MQTT_HOST}:{MQTT_PORT}")
        client.subscribe(MQTT_TOPIC)
        print(f"[MQTT] Subscribe ke topik: {MQTT_TOPIC}")
    else:
        print(f"[MQTT] Koneksi gagal (code {rc_val})")


def on_message(client, userdata, msg):
    payload = msg.payload.decode("utf-8", errors="ignore").strip()
    if not payload:
        return
    print(f"[MQTT] Pesan masuk: {payload}")

    if "," in payload:
        nama, status = payload.split(",", 1)
        nama, status = nama.strip(), status.strip()
    else:
        nama, status = payload.strip(), ""

    if not is_success_status(status):
        print(f"[SKIP] Status '{status}' tidak memicu foto.")
        return

    threading.Thread(target=handle_scan_event, args=(nama, status), daemon=True).start()


def main():
    parser = argparse.ArgumentParser(description="RTSP Snapshot Bridge untuk Web Absensi")
    parser.add_argument("--test", action="store_true", help="Tes ambil 1 foto dari RTSP dan simpan sebagai test_snapshot.jpg")
    args = parser.parse_args()

    if args.test:
        out = "test_snapshot.jpg"
        print(f"[TEST] Mengambil snapshot dari: {RTSP_URL}")
        if capture_rtsp_snapshot(RTSP_URL, out):
            print(f"[TEST] Berhasil! Gambar tersimpan di: {os.path.abspath(out)}")
        else:
            print("[TEST] Gagal mengambil gambar dari RTSP.")
        return

    try:
        client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
    except AttributeError:
        client = mqtt.Client()

    if MQTT_USER:
        client.username_pw_set(MQTT_USER, MQTT_PASS)

    if hasattr(client, "reconnect_delay_set"):
        client.reconnect_delay_set(min_delay=2, max_delay=30)

    client.on_connect = on_connect
    client.on_message = on_message

    while True:
        try:
            print(f"[MQTT] Menghubungkan ke {MQTT_HOST}:{MQTT_PORT}...")
            client.connect(MQTT_HOST, MQTT_PORT, keepalive=60)
            client.loop_forever()
        except KeyboardInterrupt:
            print("[EXIT] Dihentikan oleh user.")
            break
        except Exception as exc:
            print(f"[MQTT] Koneksi terputus ({exc}), mencoba ulang dalam 5 detik...")
            time.sleep(5)


if __name__ == "__main__":
    main()
