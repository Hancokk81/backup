#!/bin/bash

# === KONFIGURASI (ISI MANUAL) ===
PANEL_URL="https://isi-panel-lo"
API_KEY="API_ADMIN_PTERODACTYL"
MYSQL_USER="root"
MYSQL_PASS="passwordmysql"

# === SETUP ===
BACKUP_DIR="/root/pterodactyl-db-backup"
DATE=$(date +"%Y-%m-%d_%H-%M")
mkdir -p "$BACKUP_DIR/$DATE"

# === AMBIL LIST DATABASE DARI API ===
DB_LIST=$(curl -s -H "Authorization: Bearer $API_KEY" \
    -H "Content-Type: application/json" \
    "$PANEL_URL/api/application/databases" | jq -r '.data[].attributes.name')

# === BACKUP SEMUA DATABASE ===
for DB_NAME in $DB_LIST; do
    mysqldump -u$MYSQL_USER -p$MYSQL_PASS "$DB_NAME" > "$BACKUP_DIR/$DATE/$DB_NAME.sql"
done

# === KOMPRES DAN UPLOAD KE GOOGLE DRIVE ===
cd "$BACKUP_DIR"
zip -r "$DATE.zip" "$DATE"
rclone copy "$DATE.zip" gdrive:/pterodactyl-backup/

echo "Backup selesai dan diupload ke Google Drive."
