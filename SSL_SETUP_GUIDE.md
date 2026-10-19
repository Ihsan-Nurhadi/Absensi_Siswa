# Panduan Setup HTTPS / SSL di Port 3004 (dev.nayakacloud.com:3004)

Panduan ini dikhususkan jika domain **`dev.nayakacloud.com`** pada port 80 & 443 sudah digunakan oleh aplikasi lain (seperti Nextcloud / Web lain), dan Anda ingin menjalankan **Web Absensi Siswa** dengan **HTTPS** pada port **3004** (`https://dev.nayakacloud.com:3004`).

---

## 🏛️ Arsitektur Sistem

```
[ Pengguna Browser ]
        │
        ├──► https://dev.nayakacloud.com (Port 443)  ──► [ Program Lain / Nextcloud ] (TIDAK TERGANGGU)
        │
        └──► https://dev.nayakacloud.com:3004        ──► [ Nginx Host Port 3004 SSL ]
                                                                   │ (Reverse Proxy)
                                                                   ▼
                                                         [ Docker Absensi Port 3005 ]
```

1. **Aplikasi Lama (Port 80 & 443):** Tetap berjalan normal 100% tanpa perubahan.
2. **Web Absensi Siswa (Port 3004):** Berjalan dengan protokol aman **HTTPS** memanfaatkan sertifikat SSL `dev.nayakacloud.com` yang sudah ada di VPS.
3. **Auto-Redirect:** Jika pengguna tidak sengaja membuka `http://dev.nayakacloud.com:3004`, Nginx otomatis mengalihkan (*redirect*) ke `https://dev.nayakacloud.com:3004`.

---

## 🚀 Langkah Instalasi Cepat (1 Perintah)

Kami telah menyediakan skrip otomatis [**`setup-ssl-port-3004.sh`**](file:///c:/Users/nasch/Downloads/Web%20Absensi%20siswa/setup-ssl-port-3004.sh).

Di terminal VPS Anda, cukup jalankan:

```bash
cd ~/absensi
# Tarik update terbaru dari git:
git pull origin main

# Jalankan skrip setup otomatis:
sudo bash setup-ssl-port-3004.sh
```

Skrip ini akan secara otomatis:
1. Mendeteksi lokasi file sertifikat SSL `dev.nayakacloud.com` yang sudah terpasang di VPS (dari Let's Encrypt / Nextcloud).
2. Memasang konfigurasi Nginx baru di `/etc/nginx/conf.d/absensi-ssl-3004.conf`.
3. Membuka izin port 3004 di firewall UFW.
4. Mengubah port Docker frontend ke port internal 3005 (`127.0.0.1:3005:80`), sehingga port 3004 dipegang oleh Nginx SSL.
5. Me-reload Nginx tanpa downtime untuk aplikasi lama.

---

## 🛠️ Langkah Manual (Jika Ingin Dijalankan Sendiri)

Jika Anda ingin melihat atau menjalankan langkah-langkahnya secara manual:

### 1. Cek Lokasi Sertifikat SSL di VPS
Jalankan perintah berikut di VPS untuk melihat path sertifikat yang sedang dipakai:
```bash
sudo grep -rh "ssl_certificate " /etc/nginx/ | grep -v "#" | head -n 1
sudo grep -rh "ssl_certificate_key " /etc/nginx/ | grep -v "#" | head -n 1
```
*(Biasanya berada di `/etc/letsencrypt/live/dev.nayakacloud.com/fullchain.pem` dan `privkey.pem`).*

### 2. Buat File Konfigurasi Nginx di Port 3004
Buat file `/etc/nginx/conf.d/absensi-ssl-3004.conf`:
```bash
sudo nano /etc/nginx/conf.d/absensi-ssl-3004.conf
```

Salin isi konfigurasi berikut:
```nginx
server {
    listen 3004 ssl;
    server_name dev.nayakacloud.com;

    # Sesuaikan dengan path sertifikat yang Anda temukan di Langkah 1:
    ssl_certificate /etc/letsencrypt/live/dev.nayakacloud.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/dev.nayakacloud.com/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Auto-redirect jika pengguna mengetik http:// ke https://
    error_page 497 https://$host:3004$request_uri;

    client_max_body_size 25M;

    location / {
        proxy_pass http://127.0.0.1:3005;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host:3004;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-Forwarded-Port 3004;
        proxy_read_timeout 120s;
        proxy_connect_timeout 60s;
    }
}
```

### 3. Update `docker-compose.yml`
Pastikan service `frontend` di `docker-compose.yml` mengarah ke port internal 3005:
```yaml
    ports:
      - "127.0.0.1:3005:80"
```

Lalu jalankan ulang container:
```bash
docker compose up -d
```

### 4. Uji dan Reload Nginx
```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## 🧪 Pengujian di Browser

Buka browser Anda dan akses:
👉 **`https://dev.nayakacloud.com:3004`**

- Ikon **gembok aman (🔒 Connection is secure)** akan langsung aktif dan valid.
- Aplikasi lama di **`https://dev.nayakacloud.com`** (port 443) tetap berjalan tanpa gangguan sama sekali.
