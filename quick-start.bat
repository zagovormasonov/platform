@echo off
setlocal enabledelayedexpansion

echo 🚀 Быстрый старт развертывания платформы на Timeweb Cloud
echo ==================================================

REM Проверка наличия Docker
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker не установлен. Устанавливаем...
    echo.
    echo 📥 Скачайте Docker Desktop с официального сайта:
    echo    https://www.docker.com/products/docker-desktop
    echo.
    echo После установки Docker Desktop перезапустите этот скрипт.
    pause
    exit /b 1
)

echo ✅ Docker установлен

REM Проверка наличия Docker Compose
docker-compose --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker Compose не установлен. Устанавливаем...
    echo.
    echo 📥 Docker Compose обычно входит в состав Docker Desktop.
    echo    Убедитесь, что Docker Desktop запущен.
    pause
    exit /b 1
)

echo ✅ Docker Compose установлен

REM Проверка наличия файлов
if not exist "docker-compose.prod.yml" (
    echo ❌ Файл docker-compose.prod.yml не найден
    pause
    exit /b 1
)

if not exist "env.production" (
    echo ❌ Файл env.production не найден
    pause
    exit /b 1
)

REM Создание .env файла если его нет
if not exist ".env" (
    echo 📋 Создаем файл .env из env.production...
    copy env.production .env
    echo.
    echo ⚠️  ВАЖНО: Отредактируйте файл .env и измените пароли!
    echo.
    echo 📝 Откройте файл .env в блокноте и измените:
    echo    - POSTGRES_PASSWORD (пароль для PostgreSQL)
    echo    - JWT_SECRET (секретный ключ для JWT)
    echo    - CORS_ORIGIN (ваш домен)
    echo.
    notepad .env
    echo.
    echo Нажмите любую клавишу после редактирования .env файла...
    pause > nul
)

REM Проверка обязательных переменных
echo 🔍 Проверяем переменные окружения...

for /f "usebackq tokens=1,2 delims==" %%a in (".env") do (
    if not "%%a"=="" if not "%%a:~0,1%"=="#" (
        set "%%a=%%b"
    )
)

if "%POSTGRES_PASSWORD%"=="" (
    echo ❌ POSTGRES_PASSWORD не установлен
    echo    Отредактируйте файл .env и установите безопасный пароль
    pause
    exit /b 1
)

if "%POSTGRES_PASSWORD%"=="your_very_secure_password_here_change_this" (
    echo ❌ POSTGRES_PASSWORD использует значение по умолчанию
    echo    Отредактируйте файл .env и установите безопасный пароль
    pause
    exit /b 1
)

if "%JWT_SECRET%"=="" (
    echo ❌ JWT_SECRET не установлен
    echo    Отредактируйте файл .env и установите безопасный секретный ключ
    pause
    exit /b 1
)

if "%JWT_SECRET%"=="your_very_secure_jwt_secret_key_here_change_this_in_production" (
    echo ❌ JWT_SECRET использует значение по умолчанию
    echo    Отредактируйте файл .env и установите безопасный секретный ключ
    pause
    exit /b 1
)

echo ✅ Переменные окружения настроены корректно

REM Создание необходимых директорий
echo 📁 Создаем необходимые директории...
if not exist "nginx\ssl" mkdir nginx\ssl
if not exist "nginx\logs" mkdir nginx\logs
if not exist "backend\uploads" mkdir backend\uploads
if not exist "backups" mkdir backups

REM Создание самоподписанного SSL сертификата (для тестирования)
if not exist "nginx\ssl\cert.pem" (
    echo 🔐 Создаем самоподписанный SSL сертификат для тестирования...
    echo.
    echo ⚠️  Для production использования рекомендуется использовать реальные SSL сертификаты
    echo.
    REM Создаем простой самоподписанный сертификат
    echo Creating self-signed certificate...
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout nginx\ssl\key.pem -out nginx\ssl\cert.pem -subj "/C=RU/ST=Moscow/L=Moscow/O=Platform/CN=localhost" 2>nul
    if %errorlevel% neq 0 (
        echo ⚠️  OpenSSL не найден. SSL сертификат не создан.
        echo    Для production использования установите OpenSSL или используйте реальные сертификаты.
    ) else (
        echo ✅ SSL сертификат создан
    )
)

REM Запуск деплоя
echo 🚀 Запускаем деплой...
call scripts\deploy.bat

echo.
echo 🎉 Развертывание завершено!
echo.
echo 📊 Полезные команды:
echo    Статус сервисов: docker-compose -f docker-compose.prod.yml ps
echo    Логи: docker-compose -f docker-compose.prod.yml logs -f
echo    Health check: curl http://localhost/api/health
echo    Резервная копия: scripts\backup.bat
echo.
echo 🌐 Приложение должно быть доступно по адресу: http://localhost
echo    (или по вашему домену, если настроен)
echo.
echo ⚠️  Для production использования:
echo    1. Настройте реальный SSL сертификат
echo    2. Измените домен в nginx\nginx.prod.conf
echo    3. Настройте файрвол
echo    4. Настройте мониторинг
echo.
pause
