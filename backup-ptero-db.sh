#!/bin/bash

CONFIG_FILE="/root/.ptero_backup_config"

# === CEK KONFIGURASI ===
if [ ! -f "$CONFIG_FILE" ]; then
    echo "== Setup Pertama Kali =="

    read -p "Masukkan URL Panel Pterodactyl (contoh: https://panel.domain.com): " PANEL_URL
    read -p "Masukkan API Key Admin Pterodactyl: " API_KEY
    read -p "Masukkan Username MySQL (contoh: root): " MYSQL_USER
    read -sp "Masukkan Password MySQL: " MYSQL_PASS
    echo
    read -p "Masukkan nama remote Google Drive di rclone (contoh: gdrive): " RCLONE_REMOTE

    echo "PANEL_URL=\"$PANEL_URL\"" > "$CONFIG_FILE"
    echo "API_KEY=\"$API_KEY\"" >> "$CONFIG_FILE"
    echo "MYSQL_USER=\"$MYSQL_USER\"" >> "$CONFIG_FILE"
    echo "MYSQL_PASS=\"$MYSQL_PASS\"" >> "$CONFIG_FILE"
    echo "RCLONE_REMOTE=\"$RCLONE_REMOTE\"" >> "$CONFIG_FILE"

    echo "Konfigurasi disimpan di $CONFIG_FILE"
else
    source "$CONFIG_FILE"
fi

# === SETUP FOLDER ===
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
rclone copy "$DATE.zip" "$RCLONE_REMOTE:/pterodactyl-backup/"

echo "Backup selesai dan diupload ke Google Drive."

# === AUTO PASANG CRON ===
CRON_EXISTS=$(crontab -l | grep -c "backup-ptero-db.sh")
if [ "$CRON_EXISTS" -eq "0" ]; then
    (crontab -l 2>/dev/null; echo "0 * * * * /root/backup-ptero-db.sh") | crontab -
    echo "Cronjob backup tiap jam berhasil dipasang."
fi
