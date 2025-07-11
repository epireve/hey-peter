#!/bin/bash

# HeyPeter Academy Database Backup Script
# This script creates automated backups of the database

set -e

# Configuration
BACKUP_DIR="/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-7}

# Database connection details
DB_HOST=${DB_HOST:-"postgres"}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-"postgres"}
DB_USER=${DB_USER:-"postgres"}
DB_PASSWORD=${PGPASSWORD}

# Backup file name
BACKUP_FILE="${BACKUP_DIR}/heypeter_backup_${TIMESTAMP}.sql"
COMPRESSED_FILE="${BACKUP_FILE}.gz"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo "Starting database backup at $(date)"
echo "Backup file: $BACKUP_FILE"

# Create the backup
pg_dump \
  --host="$DB_HOST" \
  --port="$DB_PORT" \
  --username="$DB_USER" \
  --dbname="$DB_NAME" \
  --no-owner \
  --no-privileges \
  --clean \
  --if-exists \
  --verbose \
  --file="$BACKUP_FILE"

# Check if backup was successful
if [ $? -eq 0 ]; then
  echo "Database backup completed successfully"
  
  # Compress the backup
  gzip "$BACKUP_FILE"
  echo "Backup compressed: $COMPRESSED_FILE"
  
  # Calculate file size
  BACKUP_SIZE=$(du -h "$COMPRESSED_FILE" | cut -f1)
  echo "Backup size: $BACKUP_SIZE"
  
  # Verify backup integrity
  echo "Verifying backup integrity..."
  gunzip -t "$COMPRESSED_FILE"
  
  if [ $? -eq 0 ]; then
    echo "Backup integrity verified"
  else
    echo "ERROR: Backup integrity check failed"
    exit 1
  fi
  
else
  echo "ERROR: Database backup failed"
  exit 1
fi

# Cleanup old backups
echo "Cleaning up backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR" -name "heypeter_backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete

# List remaining backups
echo "Current backups:"
ls -lh "$BACKUP_DIR"/heypeter_backup_*.sql.gz

echo "Backup process completed at $(date)"

# Optional: Upload to cloud storage
if [ -n "$S3_BUCKET" ]; then
  echo "Uploading backup to S3..."
  aws s3 cp "$COMPRESSED_FILE" "s3://$S3_BUCKET/backups/$(basename "$COMPRESSED_FILE")"
  
  if [ $? -eq 0 ]; then
    echo "Backup uploaded to S3 successfully"
  else
    echo "WARNING: Failed to upload backup to S3"
  fi
fi

# Send notification (optional)
if [ -n "$WEBHOOK_URL" ]; then
  curl -X POST "$WEBHOOK_URL" \
    -H "Content-Type: application/json" \
    -d "{\"text\":\"Database backup completed successfully. Size: $BACKUP_SIZE\"}"
fi

exit 0