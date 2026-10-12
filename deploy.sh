#!/bin/bash
set -e

echo "=========================================================="
echo "  Deploying Web Absensi Siswa to VPS 110.232.92.134:3004"
echo "=========================================================="

# Stop old containers if any
docker compose down

# Build images
echo "[1/3] Building Docker images..."
docker compose build

# Start services in background
echo "[2/3] Starting containers..."
docker compose up -d

# Show status
echo "[3/3] Deployment finished successfully!"
echo "----------------------------------------------------------"
docker compose ps
echo "----------------------------------------------------------"
echo "Aplikasi aktif di: http://110.232.92.134:3004"
echo "Django Admin:      http://110.232.92.134:3004/admin"
echo "Cek log backend:   docker compose logs -f backend"
echo "=========================================================="
