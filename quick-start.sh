#!/bin/bash

# Скрипт быстрого старта для развертывания платформы
# Использование: ./quick-start.sh

set -e

echo "🚀 Быстрый старт развертывания платформы на Timeweb Cloud"
echo "=================================================="

# Проверка наличия Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker не установлен. Устанавливаем..."
    
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

# Проверка наличия файлов
if [ ! -f "docker-compose.prod.yml" ]; then
    echo "❌ Файл docker-compose.prod.yml не найден"
    exit 1
fi

if [ ! -f "env.production" ]; then
    echo "❌ Файл env.production не найден"
    exit 1
fi

# Создание .env файла если его нет
if [ ! -f ".env" ]; then
    echo "📋 Создаем файл .env из env.production..."
    cp env.production .env
    echo "⚠️  ВАЖНО: Отредактируйте файл .env и измените пароли!"
    echo "   nano .env"
    echo ""
    read -p "Нажмите Enter после редактирования .env файла..."
fi

# Проверка обязательных переменных
echo "🔍 Проверяем переменные окружения..."

source .env

if [ -z "$POSTGRES_PASSWORD" ] || [ "$POSTGRES_PASSWORD" = "your_secure_password" ]; then
    echo "❌ POSTGRES_PASSWORD не установлен или использует значение по умолчанию"
    echo "   Отредактируйте файл .env и установите безопасный пароль"
    exit 1
fi

if [ -z "$JWT_SECRET" ] || [ "$JWT_SECRET" = "your_very_secure_jwt_secret_key_here_change_this_in_production" ]; then
    echo "❌ JWT_SECRET не установлен или использует значение по умолчанию"
    echo "   Отредактируйте файл .env и установите безопасный секретный ключ"
    exit 1
fi

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

# Сделать скрипты исполняемыми
echo "🔧 Настраиваем скрипты..."
chmod +x scripts/*.sh

# Запуск деплоя
echo "🚀 Запускаем деплой..."
./scripts/deploy.sh

echo ""
echo "🎉 Развертывание завершено!"
echo ""
echo "📊 Полезные команды:"
echo "   Статус сервисов: docker-compose -f docker-compose.prod.yml ps"
echo "   Логи: docker-compose -f docker-compose.prod.yml logs -f"
echo "   Health check: curl http://localhost/api/health"
echo "   Резервная копия: ./scripts/backup.sh"
echo ""
echo "🌐 Приложение должно быть доступно по адресу: http://localhost"
echo "   (или по вашему домену, если настроен)"
echo ""
echo "⚠️  Для production использования:"
echo "   1. Настройте реальный SSL сертификат"
echo "   2. Измените домен в nginx/nginx.prod.conf"
echo "   3. Настройте файрвол"
echo "   4. Настройте мониторинг"
