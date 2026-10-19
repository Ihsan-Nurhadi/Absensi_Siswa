#!/usr/bin/env bash
# ==============================================================================
# Script Setup HTTPS di Port 3004 untuk dev.nayakacloud.com
# Menggunakan sertifikat SSL dev.nayakacloud.com yang sudah aktif di VPS
# ==============================================================================

set -e

DOMAIN="dev.nayakacloud.com"
PORT_PUBLIC="3004"
PORT_INTERNAL="3005"

echo "=========================================================="
echo "  SETUP HTTPS / SSL DI PORT ${PORT_PUBLIC} UNTUK ${DOMAIN}"
echo "=========================================================="

# 1. Pastikan dijalankan sebagai root / sudo
if [ "$EUID" -ne 0 ]; then
  echo "[ERROR] Harap jalankan script ini dengan sudo:"
  echo "        sudo bash setup-ssl-port-3004.sh"
  exit 1
fi

# 2. Deteksi lokasi sertifikat SSL yang sudah ada di VPS
echo "[1/4] Mendeteksi sertifikat SSL yang sudah aktif di VPS..."

CERT_PATH=""
KEY_PATH=""

# Cek lokasi standar Let's Encrypt
if [ -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]; then
    CERT_PATH="/etc/letsencrypt/live/${DOMAIN}/fullchain.pem"
    KEY_PATH="/etc/letsencrypt/live/${DOMAIN}/privkey.pem"
else
    # Coba cari dari konfigurasi Nginx yang sudah berjalan
    DETECTED_CERT=$(grep -rh "ssl_certificate " /etc/nginx/ 2>/dev/null | grep -v "#" | head -n 1 | awk '{print $2}' | tr -d ';')
    DETECTED_KEY=$(grep -rh "ssl_certificate_key " /etc/nginx/ 2>/dev/null | grep -v "#" | head -n 1 | awk '{print $2}' | tr -d ';')
    
    if [ -n "$DETECTED_CERT" ] && [ -f "$DETECTED_CERT" ]; then
        CERT_PATH="$DETECTED_CERT"
        KEY_PATH="$DETECTED_KEY"
    fi
fi

if [ -z "$CERT_PATH" ] || [ ! -f "$CERT_PATH" ]; then
    echo "[PERINGATAN] File sertifikat SSL dev.nayakacloud.com tidak ditemukan di /etc/letsencrypt/."
    echo "Mencoba mencari di seluruh sistem..."
    FOUND_CERT=$(find /etc/ -name "*${DOMAIN}*.pem" -o -name "*${DOMAIN}*.crt" 2>/dev/null | head -n 1)
    if [ -n "$FOUND_CERT" ]; then
        echo "Ditemukan sertifikat alternatif di: $FOUND_CERT"
        CERT_PATH="$FOUND_CERT"
    else
        echo "[ERROR] Tidak dapat menemukan sertifikat SSL dev.nayakacloud.com di VPS."
        echo "Harap pastikan path sertifikat SSL pada file /etc/nginx/conf.d/absensi-ssl-3004.conf sudah sesuai."
        exit 1
    fi
fi

echo "-> Menggunakan Sertifikat: $CERT_PATH"
echo "-> Menggunakan Private Key: $KEY_PATH"

# 3. Ubah docker-compose.yml agar container internal memakai port 3005
echo "[2/4] Mengalihkan port Docker frontend ke internal port ${PORT_INTERNAL}..."
if [ -f "docker-compose.yml" ]; then
    # Ganti "3004:80" menjadi "127.0.0.1:3005:80"
    sed -i "s/\"3004:80\"/\"127.0.0.1:${PORT_INTERNAL}:80\"/g" docker-compose.yml
    sed -i "s/'3004:80'/'127.0.0.1:${PORT_INTERNAL}:80'/g" docker-compose.yml
fi

# 4. Buat konfigurasi Nginx Host untuk port 3004 SSL
echo "[3/4] Memasang konfigurasi Nginx Host di /etc/nginx/conf.d/absensi-ssl-3004.conf..."
cat << EOF > /etc/nginx/conf.d/absensi-ssl-3004.conf
server {
    listen ${PORT_PUBLIC} ssl;
    server_name ${DOMAIN};

    ssl_certificate ${CERT_PATH};
    ssl_certificate_key ${KEY_PATH};

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Auto-redirect jika pengguna membuka dengan http://
    error_page 497 https://\$host:${PORT_PUBLIC}\$request_uri;

    client_max_body_size 25M;

    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private auth;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    location / {
        proxy_pass http://127.0.0.1:${PORT_INTERNAL};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host:${PORT_PUBLIC};
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-Forwarded-Port ${PORT_PUBLIC};
        proxy_read_timeout 120s;
        proxy_connect_timeout 60s;
    }
}
EOF

# Pastikan firewall mengizinkan port 3004
if command -v ufw > /dev/null 2>&1; then
    ufw allow ${PORT_PUBLIC}/tcp || true
    ufw reload || true
fi

# 5. Uji konfigurasi Nginx dan Restart Layanan
echo "[4/4] Menguji konfigurasi Nginx dan me-restart container..."
nginx -t
systemctl reload nginx

# Jalankan ulang docker-compose dengan port baru
docker compose up -d

echo ""
echo "=========================================================="
echo "  SETUP HTTPS PORT ${PORT_PUBLIC} SELESAI!"
echo "=========================================================="
echo "Website sekarang dapat diakses secara aman melalui:"
echo "  URL: https://${DOMAIN}:${PORT_PUBLIC}"
echo ""
echo "Program lain di https://${DOMAIN} (port 443) TETAP BERJALAN NORMAL."
echo "Setiap request HTTP ke port ${PORT_PUBLIC} akan otomatis dialihkan ke HTTPS."
echo "=========================================================="
