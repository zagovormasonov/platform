#!/bin/bash

# Скрипт для создания резервной копии базы данных
# Использование: ./scripts/backup.sh

set -e

BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/platform_backup_$TIMESTAMP.sql"

echo "💾 Создаем резервную копию базы данных..."

# Создаем директорию для бэкапов
mkdir -p $BACKUP_DIR

# Загружаем переменные окружения
export $(cat env.production | grep -v '^#' | xargs)

# Создаем резервную копию
docker-compose -f docker-compose.prod.yml exec -T postgres pg_dump \
    -U platform_user \
    -d platform_db \
    --clean \
    --if-exists \
    --create \
    > $BACKUP_FILE

# Сжимаем резервную копию
gzip $BACKUP_FILE

echo "✅ Резервная копия создана: ${BACKUP_FILE}.gz"

# Удаляем старые резервные копии (старше 7 дней)
find $BACKUP_DIR -name "platform_backup_*.sql.gz" -mtime +7 -delete

echo "🧹 Старые резервные копии удалены"
