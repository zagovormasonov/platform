#!/bin/bash

# Скрипт для запуска Socket.IO сервера
echo "🚀 Запуск Socket.IO сервера для чатов..."

# Проверяем наличие Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js не найден. Пожалуйста, установите Node.js"
    exit 1
fi

# Проверяем наличие файла сервера
if [ ! -f "socketio-server.js" ]; then
    echo "❌ Файл socketio-server.js не найден"
    exit 1
fi

# Устанавливаем зависимости если нужно
if [ ! -d "node_modules" ] || [ ! -f "package.json" ]; then
    echo "📦 Установка зависимостей..."
    npm install
fi

# Запускаем сервер
echo "🔌 Запуск Socket.IO сервера на порту 3001..."
echo "🌐 CORS настроен для: http://localhost:5173, http://localhost:3000"
echo "📱 Для остановки нажмите Ctrl+C"
echo ""

node socketio-server.js
