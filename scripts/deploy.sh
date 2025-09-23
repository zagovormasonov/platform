#!/bin/bash

# Скрипт для деплоя на Timeweb Cloud
# Использование: ./scripts/deploy.sh [environment]

set -e

ENVIRONMENT=${1:-production}
PROJECT_NAME="platform"
DOCKER_COMPOSE_FILE="docker-compose.prod.yml"

echo "🚀 Начинаем деплой проекта $PROJECT_NAME в окружение $ENVIRONMENT"

# Проверяем наличие необходимых файлов
if [ ! -f "$DOCKER_COMPOSE_FILE" ]; then
    echo "❌ Файл $DOCKER_COMPOSE_FILE не найден"
    exit 1
fi

if [ ! -f "env.production" ]; then
    echo "❌ Файл env.production не найден"
    exit 1
fi

# Загружаем переменные окружения
echo "📋 Загружаем переменные окружения..."
export $(cat env.production | grep -v '^#' | xargs)

# Проверяем обязательные переменные
required_vars=("POSTGRES_PASSWORD" "JWT_SECRET" "CORS_ORIGIN")
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Переменная $var не установлена"
        exit 1
    fi
done

# Останавливаем существующие контейнеры
echo "🛑 Останавливаем существующие контейнеры..."
docker-compose -f $DOCKER_COMPOSE_FILE down --remove-orphans

# Удаляем старые образы (опционально)
echo "🧹 Очищаем старые образы..."
docker system prune -f

# Собираем новые образы
echo "🔨 Собираем новые образы..."
docker-compose -f $DOCKER_COMPOSE_FILE build --no-cache

# Запускаем сервисы
echo "▶️ Запускаем сервисы..."
docker-compose -f $DOCKER_COMPOSE_FILE up -d

# Ждем запуска базы данных
echo "⏳ Ждем запуска базы данных..."
sleep 30

# Проверяем статус сервисов
echo "🔍 Проверяем статус сервисов..."
docker-compose -f $DOCKER_COMPOSE_FILE ps

# Проверяем логи
echo "📋 Проверяем логи..."
docker-compose -f $DOCKER_COMPOSE_FILE logs --tail=50

# Проверяем health check
echo "🏥 Проверяем health check..."
sleep 10

if curl -f http://localhost/api/health > /dev/null 2>&1; then
    echo "✅ Health check прошел успешно"
else
    echo "❌ Health check не прошел"
    echo "📋 Логи backend:"
    docker-compose -f $DOCKER_COMPOSE_FILE logs backend
    exit 1
fi

echo "🎉 Деплой завершен успешно!"
echo "🌐 Приложение доступно по адресу: $CORS_ORIGIN"
echo "📊 Мониторинг: docker-compose -f $DOCKER_COMPOSE_FILE logs -f"
