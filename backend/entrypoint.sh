#!/bin/sh
set -e

# If custom db path is specified (e.g., persistent volume in /app/data), ensure directory exists
if [ -n "$SQLITE_DB_PATH" ]; then
    DB_DIR=$(dirname "$SQLITE_DB_PATH")
    mkdir -p "$DB_DIR"
    # Copy initial database if volume is currently empty
    if [ ! -f "$SQLITE_DB_PATH" ] && [ -f "/app/db.sqlite3" ]; then
        echo "[Entrypoint] Initializing persistent database from seed db.sqlite3..."
        cp /app/db.sqlite3 "$SQLITE_DB_PATH"
    fi
fi

echo "[Entrypoint] Applying database migrations..."
python manage.py migrate --noinput

echo "[Entrypoint] Collecting static files..."
python manage.py collectstatic --noinput

echo "[Entrypoint] Starting Gunicorn server on 0.0.0.0:8000..."
exec gunicorn config.wsgi:application \
    --bind 0.0.0.0:8000 \
    --workers 1 \
    --threads 4 \
    --timeout 120
