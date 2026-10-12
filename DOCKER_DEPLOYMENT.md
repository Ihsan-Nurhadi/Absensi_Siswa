# Panduan Deploy Web Absensi Siswa di VPS (Docker & Nginx)

Dokumentasi ini menjelaskan langkah-langkah menjalankan aplikasi **Web Absensi Siswa** di VPS Anda (**IP: 110.232.92.134**) pada port **3004**.

---

## Arsitektur Sistem

- **Frontend Container (`absensi_frontend`)**:
  - Image: Nginx Alpine
  - Build React SPA (Vite)
  - Reverse proxy ke backend untuk rute `/api/` dan `/admin/`
  - Menyajikan asset statis Django Admin (`/static/`)
  - Di-expose ke port **3004** pada VPS (`http://110.232.92.134:3004`)
- **Backend Container (`absensi_backend`)**:
  - Image: Python 3.11-slim + Gunicorn
  - Django REST Framework
  - Background MQTT Attendance listener (`ENABLE_MQTT=true`)
  - Volume persistent database SQLite di `/app/data/db.sqlite3` (data siswa & absensi tidak akan hilang saat rebuild)

---

## Persiapan di VPS (110.232.92.134)

### 1. Pastikan Docker & Docker Compose Terpasang
Jika belum terpasang di VPS (Ubuntu/Debian):
```bash
sudo apt update
sudo apt install -y docker.io docker-compose-plugin
sudo systemctl enable --now docker
```

Pastikan user Anda memiliki izin docker (opsional):
```bash
sudo usermod -aG docker $USER
```

### 2. Izinkan Port 3004 di Firewall VPS
Jika VPS menggunakan `ufw`:
```bash
sudo ufw allow 3004/tcp
sudo ufw reload
```
*(Pastikan juga security group / inbound rules di dashboard provider VPS Anda mengizinkan TCP port 3004).*

---

## Langkah Deployment

### 1. Upload/Salin Project ke VPS
Anda dapat meng-upload folder project menggunakan Git, SCP, atau Rsync ke direktori kerja di VPS (misalnya `/var/www/absensi` atau `~/absensi`).

Contoh dengan SCP dari komputer lokal:
```bash
scp -r "c:\Users\nasch\Downloads\Web Absensi siswa" root@110.232.92.134:~/absensi
```
Atau jika menggunakan Git:
```bash
git clone <URL_REPO_ANDA> ~/absensi
cd ~/absensi
```

### 2. Masuk ke Direktori Project di VPS
```bash
cd ~/absensi
```

### 3. Jalankan Docker Compose
Cukup jalankan satu perintah berikut:
```bash
docker compose up -d --build
```
*(Atau jalankan skrip bantuan: `bash deploy.sh`)*

Proses ini akan secara otomatis:
1. Mem-build frontend React dengan Vite.
2. Mem-build backend Django dengan Gunicorn.
3. Melakukan migrasi database (`migrate`) dan `collectstatic`.
4. Menginisialisasi database SQLite ke volume persistent.
5. Menjalankan listener MQTT absensi di background.
6. Menjalankan Nginx pada port **3004**.

---

## Verifikasi & Penggunaan

1. **Akses Web Siswa & Guru**:
   - Buka browser: `http://110.232.92.134:3004`
2. **Akses Django Admin**:
   - Buka browser: `http://110.232.92.134:3004/admin`
3. **Melihat Log Kontainer**:
   ```bash
   # Melihat semua log
   docker compose logs -f

   # Melihat log MQTT & Backend saja
   docker compose logs -f backend

   # Melihat log Nginx / Frontend saja
   docker compose logs -f frontend
   ```

---

## Perintah Manajemen Kontainer

| Aksi | Perintah |
|---|---|
| Cek status kontainer | `docker compose ps` |
| Restart aplikasi | `docker compose restart` |
| Matikan kontainer | `docker compose down` |
| Rebuild setelah update kode | `docker compose up -d --build` |
| Masuk ke terminal backend | `docker compose exec backend bash` |
| Buat Superuser Django Admin baru | `docker compose exec backend python manage.py createsuperuser` |
