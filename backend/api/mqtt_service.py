import json
import threading
import datetime
import uuid
import time
from django.utils import timezone

def clean_epc(tag):
    """Normalizes EPC tag string by removing spaces, colons, hyphens and uppercasing."""
    if not tag:
        return ""
    return "".join(c for c in str(tag) if c.isalnum()).upper()

class MQTTService:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(MQTTService, cls).__new__(cls)
            cls._instance.client = None
            cls._instance.thread = None
            cls._instance.is_connected = False
            cls._instance.last_status = "Disconnected"
        return cls._instance

    def start(self):
        """Starts the MQTT listener thread if paho.mqtt is available."""
        if self.client and self.is_connected:
            return

        try:
            import paho.mqtt.client as mqtt
        except ImportError:
            print("[MQTT] paho-mqtt module not installed.")
            return

        def run():
            try:
                from api.models import MQTTConfig, Kelas
                config = MQTTConfig.objects.first()
                if not config or not config.is_active:
                    self.last_status = "Inactive in database"
                    print("[MQTT] Configuration is inactive or missing.")
                    return

                # Generate a unique client ID to prevent "Not authorized / Identifier rejected" on public brokers
                client_unique_id = f"absensi_be_{uuid.uuid4().hex[:6]}"

                # Paho MQTT 2.0+ vs 1.x compatibility check
                try:
                    self.client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id=client_unique_id)
                except AttributeError:
                    self.client = mqtt.Client(client_id=client_unique_id)

                # Configure Paho built-in reconnect delay
                if hasattr(self.client, 'reconnect_delay_set'):
                    self.client.reconnect_delay_set(min_delay=2, max_delay=30)

                # Only set username/password if username is provided
                if config.username and config.username.strip():
                    self.client.username_pw_set(config.username.strip(), config.password or '')

                def on_connect(client, userdata, flags, rc, properties=None):
                    rc_val = getattr(rc, 'value', rc)
                    if rc_val == 0:
                        self.is_connected = True
                        self.last_status = "Connected"
                        print(f"[MQTT] Connected successfully to {config.host}:{config.port} (Client ID: {client_unique_id})")
                        
                        # Subscribe to all active class topics
                        classes = Kelas.objects.all()
                        for k in classes:
                            if k.topic_mqtt:
                                client.subscribe(k.topic_mqtt)
                                print(f"[MQTT] Subscribed to class topic: {k.topic_mqtt}")
                    else:
                        self.is_connected = False
                        self.last_status = f"Connection failed (code {rc})"
                        print(f"[MQTT] Connection failed with code {rc}")

                def on_disconnect(client, userdata, rc, properties=None, reason_code=None):
                    self.is_connected = False
                    rc_val = getattr(rc, 'value', rc) if rc is not None else 0
                    self.last_status = f"Disconnected (code {rc_val})"
                    print(f"[MQTT] Disconnected from broker (code {rc_val}).")

                def on_message(client, userdata, msg):
                    try:
                        raw_payload = msg.payload.decode('utf-8', errors='ignore')
                        payload = raw_payload.strip('\x00\r\n\t ')
                        if not payload:
                            return

                        print(f"[MQTT] Received msg on {msg.topic}: {payload}")
                        
                        raw_tag = None
                        parsed_time = None

                        # Support both JSON objects and plain text UID/EPC payloads
                        try:
                            data = json.loads(payload)
                            if isinstance(data, dict):
                                raw_tag = (
                                    data.get('tag_epc') or 
                                    data.get('epc_tag') or 
                                    data.get('card_id') or 
                                    data.get('uid') or 
                                    data.get('epc')
                                )
                                scan_timestamp_str = data.get('timestamp')
                                if scan_timestamp_str:
                                    try:
                                        dt = datetime.datetime.fromisoformat(scan_timestamp_str.replace('Z', ''))
                                        parsed_time = dt.time()
                                    except Exception:
                                        pass
                            elif isinstance(data, (int, str)):
                                raw_tag = str(data).strip()
                        except Exception:
                            # Not a JSON payload -> RFID reader sent plain text UID / EPC directly
                            raw_tag = payload

                        # Fallback if raw_tag is still empty
                        if not raw_tag and payload:
                            raw_tag = payload

                        if raw_tag:
                            self.process_attendance(raw_tag, topic=msg.topic, force_time=parsed_time)
                    except Exception as err:
                        print(f"[MQTT] Error handling message: {err}")

                self.client.on_connect = on_connect
                self.client.on_disconnect = on_disconnect
                self.client.on_message = on_message

                print(f"[MQTT] Connecting to broker {config.host}:{config.port} with Client ID {client_unique_id}...")
                self.client.connect(config.host, config.port, keepalive=60)
                self.client.loop_forever()

            except Exception as e:
                self.is_connected = False
                self.last_status = f"Error: {e}"
                print(f"[MQTT] Exception in MQTT thread: {e}")

        self.thread = threading.Thread(target=run, daemon=True)
        self.thread.start()

    def process_attendance(self, epc_tag, topic=None, force_time=None, force_type=None):
        """
        Processes student attendance with flexible EPC tag matching, 
        Entry/Exit rules, Jam Keluar threshold, and Double/Burst scan timeout protection.
        """
        from api.models import Siswa, Absensi, Kelas
        try:
            raw_tag = str(epc_tag).strip()
            
            # 1. Flexible EPC Tag matching (exact match or normalized hex string)
            siswa = Siswa.objects.filter(epc_tag__iexact=raw_tag).first()
            if not siswa:
                clean_target = clean_epc(raw_tag)
                for s in Siswa.objects.exclude(epc_tag__isnull=True).exclude(epc_tag=''):
                    if clean_epc(s.epc_tag) == clean_target:
                        siswa = s
                        break

            if not siswa:
                print(f"[Attendance Engine] No student found with card tag: '{raw_tag}'")
                return None, f"Kartu siswa ({raw_tag}) tidak terdaftar di sistem."

            # Use local Asia/Jakarta date & time (GMT+7)
            local_now = timezone.localtime(timezone.now())
            today = local_now.date()
            now_time = force_time if force_time else local_now.time()

            # Automatic check for past records & auto-mark ALPA for unattended students
            from api.attendance_service import auto_close_past_records, auto_mark_alpa
            auto_close_past_records()

            # Class entrance, grace period, late cut-off, and departure rules
            kelas = siswa.kelas
            jam_masuk = kelas.jam_masuk if (kelas and kelas.jam_masuk) else datetime.time(7, 15)
            toleransi_menit = kelas.toleransi_terlambat_menit if (kelas and kelas.toleransi_terlambat_menit is not None) else 15
            batas_akhir_masuk = kelas.batas_akhir_masuk if (kelas and kelas.batas_akhir_masuk) else datetime.time(9, 30)
            jam_pulang = kelas.jam_pulang if (kelas and kelas.jam_pulang) else datetime.time(15, 0)
            min_interval = kelas.min_interval_pulang_jam if (kelas and kelas.min_interval_pulang_jam) else 7

            # Calculate time zone thresholds
            masuk_dt = datetime.datetime.combine(today, jam_masuk)
            toleransi_dt = masuk_dt + datetime.timedelta(minutes=toleransi_menit)
            batas_akhir_dt = datetime.datetime.combine(today, batas_akhir_masuk)
            now_dt = datetime.datetime.combine(today, now_time)

            # Determine attendance status based on the 3 Time Zones:
            # Zona 1: <= toleransi (HADIR)
            # Zona 2: toleransi < scan <= batas_akhir_masuk (TERLAMBAT)
            # Zona 3: > batas_akhir_masuk (ALPA)
            catatan_awal = ""
            if now_dt <= toleransi_dt:
                initial_status = Absensi.StatusChoices.HADIR
                if now_dt > masuk_dt:
                    diff_m = int((now_dt - masuk_dt).total_seconds() / 60)
                    catatan_awal = f"Tepat waktu (toleransi +{diff_m} menit)"
            elif now_dt <= batas_akhir_dt:
                initial_status = Absensi.StatusChoices.TERLAMBAT
                late_m = int((now_dt - masuk_dt).total_seconds() / 60)
                catatan_awal = f"Terlambat {late_m} menit"
            else:
                initial_status = Absensi.StatusChoices.ALPA
                catatan_awal = f"Melewati batas maksimal masuk ({batas_akhir_masuk.strftime('%H:%M')} WIB)"

            absensi, created = Absensi.objects.get_or_create(
                siswa=siswa,
                tanggal=today,
                defaults={
                    'waktu_scan': now_time,
                    'waktu_masuk': now_time if initial_status != Absensi.StatusChoices.ALPA else None,
                    'status': initial_status,
                    'sumber': Absensi.SumberChoices.SCAN_MQTT,
                    'catatan_koreksi': catatan_awal
                }
            )

            if created:
                # First scan of the day -> ENTRY (Absen Masuk)
                if absensi.status == Absensi.StatusChoices.HADIR:
                    status_text = "Tepat Waktu (HADIR)"
                elif absensi.status == Absensi.StatusChoices.TERLAMBAT:
                    status_text = f"TERLAMBAT ({catatan_awal})"
                else:
                    status_text = f"ALPA ({catatan_awal})"

                msg = f"Absen Masuk dicatat ({status_text}) pada jam {now_time.strftime('%H:%M')} WIB."
                print(f"[Attendance Engine] ENTRY: {siswa.nama} ({absensi.status}) at {now_time.strftime('%H:%M:%S')} WIB - {catatan_awal}")
                return absensi, msg

            # If record already exists for today:
            if force_type == 'PULANG' or absensi.waktu_pulang:
                if absensi.waktu_pulang and not force_type:
                    return absensi, f"Siswa {siswa.nama} sudah melakukan Absen Masuk ({absensi.waktu_masuk.strftime('%H:%M')}) dan Absen Pulang ({absensi.waktu_pulang.strftime('%H:%M')}) hari ini."

            # Calculate time difference between entry and current scan
            if absensi.waktu_masuk:
                entry_dt = datetime.datetime.combine(today, absensi.waktu_masuk)
                current_dt = datetime.datetime.combine(today, now_time)
                elapsed_seconds = (current_dt - entry_dt).total_seconds()
                elapsed_hours = elapsed_seconds / 3600.0

                # Check if this scan is valid for PULANG (Exit) based on Jam Keluar
                # Syarat Absen Pulang: Waktu scan harus sudah mencapai atau melewati jam_pulang sekolah
                # Dilengkapi proteksi anti-burst (jeda minimal 60 detik dari scan masuk agar tidak langsung terhitung pulang)
                is_burst_duplicate = elapsed_seconds < 60
                is_exit_time = (now_time >= jam_pulang and not is_burst_duplicate) or (force_type == 'PULANG')

                if is_exit_time:
                    absensi.waktu_pulang = now_time
                    absensi.lupa_absen_pulang = False
                    absensi.save()
                    msg = f"Absen Pulang berhasil dicatat untuk {siswa.nama} pada jam {now_time.strftime('%H:%M')} WIB. Sampai jumpa!"
                    print(f"[Attendance Engine] EXIT: {siswa.nama} at {now_time.strftime('%H:%M:%S')} WIB")
                    return absensi, msg
                else:
                    # Intermediate scan before Jam Keluar -> Double / Burst Scan Protection Triggered!
                    msg = f"Siswa {siswa.nama} sudah Absen Masuk pada jam {absensi.waktu_masuk.strftime('%H:%M')} WIB. Belum memasuki jam keluar/pulang ({jam_pulang.strftime('%H:%M')} WIB)."
                    print(f"[Attendance Engine] DOUBLE/BURST SCAN REJECTED: {siswa.nama} scanned at {now_time.strftime('%H:%M:%S')} WIB (Entry was {absensi.waktu_masuk.strftime('%H:%M:%S')}, Departure target: {jam_pulang.strftime('%H:%M:%S')})")
                    return absensi, msg

            # Fallback if entry was not recorded
            absensi.waktu_masuk = now_time
            absensi.save()
            return absensi, f"Absen Masuk berhasil dicatat pada jam {now_time.strftime('%H:%M')} WIB."

        except Exception as e:
            print(f"[Attendance Engine] Error recording attendance: {e}")
            return None, f"Error: {e}"

    def restart(self):
        """Restarts the MQTT listener (e.g. after config change)."""
        if self.client:
            try:
                self.client.disconnect()
            except Exception:
                pass
        self.is_connected = False
        self.start()

mqtt_service = MQTTService()
