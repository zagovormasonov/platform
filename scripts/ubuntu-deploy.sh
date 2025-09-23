#!/bin/bash

# Скрипт для деплоя на Ubuntu сервере
# Использование: ./scripts/ubuntu-deploy.sh

set -e

echo "🚀 Деплой платформы на Ubuntu сервер"
echo "=================================="

# Проверка наличия Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker не установлен. Устанавливаем..."
    
    # Обновление пакетов
    sudo apt update
    
    # Установка Docker
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    
    echo "✅ Docker установлен. Перезагрузите систему и запустите скрипт снова."
    exit 1
fi

# Проверка наличия Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose не установлен. Устанавливаем..."
    
    # Установка Docker Compose
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    
    echo "✅ Docker Compose установлен."
fi

# Проверка входа в Docker Hub
echo "🔑 Проверяем вход в Docker Hub..."
if ! docker system info | grep -q "Username"; then
    echo "⚠️  Вы не вошли в Docker Hub"
    echo "Войдите в Docker Hub:"
    docker login
fi

# Проверка наличия файлов
if [ ! -f "docker-compose.prod.yml" ]; then
    echo "❌ Файл docker-compose.prod.yml не найден"
    exit 1
fi

if [ ! -f ".env" ]; then
    echo "❌ Файл .env не найден"
    echo "📋 Создаем .env из env.production..."
    cp env.production .env
    echo "⚠️  ВАЖНО: Отредактируйте файл .env и измените пароли!"
    echo "   nano .env"
    echo ""
    read -p "Нажмите Enter после редактирования .env файла..."
fi

# Загружаем переменные окружения
echo "📋 Загружаем переменные окружения..."
export $(cat .env | grep -v '^#' | xargs)

# Проверяем обязательные переменные
required_vars=("POSTGRES_PASSWORD" "JWT_SECRET" "CORS_ORIGIN")
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Переменная $var не установлена"
        exit 1
    fi
done

echo "✅ Переменные окружения настроены корректно"

# Создание необходимых директорий
echo "📁 Создаем необходимые директории..."
mkdir -p nginx/ssl
mkdir -p nginx/logs
mkdir -p backend/uploads
mkdir -p backups

# Создание самоподписанного SSL сертификата (для тестирования)
if [ ! -f "nginx/ssl/cert.pem" ]; then
    echo "🔐 Создаем самоподписанный SSL сертификат для тестирования..."
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout nginx/ssl/key.pem \
        -out nginx/ssl/cert.pem \
        -subj "/C=RU/ST=Moscow/L=Moscow/O=Platform/CN=localhost"
    echo "✅ SSL сертификат создан"
fi

# Останавливаем существующие контейнеры
echo "🛑 Останавливаем существующие контейнеры..."
docker-compose -f docker-compose.prod.yml down --remove-orphans

# Удаляем старые образы (опционально)
echo "🧹 Очищаем старые образы..."
docker system prune -f

# Собираем новые образы
echo "🔨 Собираем новые образы..."
docker-compose -f docker-compose.prod.yml build --no-cache

# Запускаем сервисы
echo "▶️ Запускаем сервисы..."
docker-compose -f docker-compose.prod.yml up -d

# Ждем запуска базы данных
echo "⏳ Ждем запуска базы данных..."
sleep 30

# Проверяем статус сервисов
echo "🔍 Проверяем статус сервисов..."
docker-compose -f docker-compose.prod.yml ps

# Проверяем логи
echo "📋 Проверяем логи..."
docker-compose -f docker-compose.prod.yml logs --tail=50

# Проверяем health check
echo "🏥 Проверяем health check..."
sleep 10

if curl -f http://localhost:8080/api/health > /dev/null 2>&1; then
    echo "✅ Health check прошел успешно"
else
    echo "❌ Health check не прошел"
    echo "📋 Логи backend:"
    docker-compose -f docker-compose.prod.yml logs backend
    exit 1
fi

echo ""
echo "🎉 Деплой завершен успешно!"
echo "🌐 Приложение доступно по адресу: $CORS_ORIGIN"
echo "📋 Если порт 80 занят, приложение будет доступно на порту 8080"
echo "📊 Мониторинг: docker-compose -f docker-compose.prod.yml logs -f"
echo ""
echo "📋 Полезные команды:"
echo "   Статус сервисов: docker-compose -f docker-compose.prod.yml ps"
echo "   Логи: docker-compose -f docker-compose.prod.yml logs -f"
echo "   Health check: curl http://localhost:8080/api/health"
echo "   Резервная копия: ./scripts/backup.sh"
