@echo off
echo 🚀 Запуск Socket.IO сервера для чатов...

REM Проверяем наличие Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js не найден. Пожалуйста, установите Node.js
    pause
    exit /b 1
)

REM Проверяем наличие файла сервера
if not exist "socketio-server.js" (
    echo ❌ Файл socketio-server.js не найден
    pause
    exit /b 1
)

REM Устанавливаем зависимости если нужно
if not exist "node_modules" (
    echo 📦 Установка зависимостей...
    npm install
)

REM Запускаем сервер
echo 🔌 Запуск Socket.IO сервера на порту 3001...
echo 🌐 CORS настроен для: http://localhost:5173, http://localhost:3000
echo 📱 Для остановки нажмите Ctrl+C
echo.

node socketio-server.js

pause
