#!/bin/bash

# Скрипт для восстановления базы данных из резервной копии
# Использование: ./scripts/restore.sh <backup_file>

set -e

if [ -z "$1" ]; then
    echo "❌ Укажите файл резервной копии"
    echo "Использование: $0 <backup_file>"
    exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Файл резервной копии не найден: $BACKUP_FILE"
    exit 1
fi

echo "🔄 Восстанавливаем базу данных из файла: $BACKUP_FILE"

# Загружаем переменные окружения
export $(cat env.production | grep -v '^#' | xargs)

# Останавливаем приложение
echo "🛑 Останавливаем приложение..."
docker-compose -f docker-compose.prod.yml stop backend socketio

# Восстанавливаем базу данных
if [[ $BACKUP_FILE == *.gz ]]; then
    echo "📦 Распаковываем и восстанавливаем сжатую резервную копию..."
    gunzip -c $BACKUP_FILE | docker-compose -f docker-compose.prod.yml exec -T postgres psql -U platform_user -d postgres
else
    echo "📄 Восстанавливаем резервную копию..."
    docker-compose -f docker-compose.prod.yml exec -T postgres psql -U platform_user -d postgres < $BACKUP_FILE
fi

# Запускаем приложение
echo "▶️ Запускаем приложение..."
docker-compose -f docker-compose.prod.yml start backend socketio

echo "✅ Восстановление завершено успешно!"
