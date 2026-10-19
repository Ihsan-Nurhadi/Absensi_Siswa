#!/usr/bin/env bash
# ==============================================================================
# Script Otomatis Setup HTTPS / SSL (Let's Encrypt) untuk dev.nayakacloud.com
# Sistem: Web Absensi Siswa di VPS Ubuntu/Debian (Docker port 3004)
# ==============================================================================

set -e

DOMAIN="dev.nayakacloud.com"
PORT_DOCKER="3004"

echo "=========================================================="
echo "  SETUP HTTPS / SSL untuk ${DOMAIN}"
echo "=========================================================="

# 1. Pastikan dijalankan sebagai root / sudo
if [ "$EUID" -ne 0 ]; then
  echo "[ERROR] Harap jalankan script ini dengan sudo:"
  echo "        sudo bash setup-ssl.sh"
  exit 1
fi

# 2. Update package dan install Nginx + Certbot
echo "[1/5] Memeriksa dan menginstal Nginx & Certbot..."
apt update -y
apt install -y nginx certbot python3-certbot-nginx

# 3. Pastikan firewall mengizinkan port 80 dan 443
echo "[2/5] Mengatur firewall (UFW) untuk HTTP (80) dan HTTPS (443)..."
if command -v ufw > /dev/null 2>&1; then
    ufw allow 80/tcp || true
    ufw allow 443/tcp || true
    ufw allow ${PORT_DOCKER}/tcp || true
    ufw reload || true
fi

# 4. Buat konfigurasi Nginx reverse proxy ke Docker container
echo "[3/5] Membuat konfigurasi Nginx reverse proxy..."
cat << 'EOF' > /etc/nginx/sites-available/dev.nayakacloud.com
server {
    listen 80;
    server_name dev.nayakacloud.com;

    client_max_body_size 25M;

    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private auth;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # Reverse proxy ke container Docker frontend di port 3004
    location / {
        proxy_pass http://127.0.0.1:3004;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
        proxy_connect_timeout 60s;
    }
}
EOF

# Aktifkan site di Nginx
ln -sf /etc/nginx/sites-available/dev.nayakacloud.com /etc/nginx/sites-enabled/dev.nayakacloud.com

# Hapus default Nginx jika ada konflik
if [ -f /etc/nginx/sites-enabled/default ]; then
    rm -f /etc/nginx/sites-enabled/default
fi

# Uji konfigurasi Nginx
nginx -t
systemctl reload nginx

# 5. Pasang Sertifikat SSL Gratis via Certbot (Let's Encrypt)
echo "[4/5] Memasang sertifikat SSL Let's Encrypt untuk ${DOMAIN}..."
echo "Catatan: Pastikan DNS Record A untuk ${DOMAIN} sudah mengarah ke IP VPS ini."

certbot --nginx -d "${DOMAIN}" --redirect --register-unsafely-without-email --agree-tos || {
    echo ""
    echo "[PERINGATAN] Certbot otomatis belum selesai."
    echo "Jika DNS Anda baru diubah, tunggu beberapa menit untuk propagasi DNS, lalu jalankan:"
    echo "  sudo certbot --nginx -d ${DOMAIN}"
    exit 1
}

# 6. Uji auto-renewal certbot
echo "[5/5] Menguji otomatisasi perpanjangan sertifikat (cron renewal)..."
certbot renew --dry-run

echo ""
echo "=========================================================="
echo "  SETUP HTTPS BERHASIL!"
echo "=========================================================="
echo "Website sekarang dapat diakses secara aman melalui:"
echo "  1. Domain (HTTPS):  https://${DOMAIN}"
echo "  2. IP VPS (Direct): http://110.232.92.134:${PORT_DOCKER}"
echo ""
echo "Semua request HTTP ke ${DOMAIN} otomatis dialihkan ke HTTPS."
echo "=========================================================="
