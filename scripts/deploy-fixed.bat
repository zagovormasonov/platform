@echo off
setlocal enabledelayedexpansion

echo 🚀 Начинаем деплой проекта platform в окружение production

REM Проверяем наличие необходимых файлов
if not exist "docker-compose.prod.yml" (
    echo ❌ Файл docker-compose.prod.yml не найден
    exit /b 1
)

if not exist ".env" (
    echo ❌ Файл .env не найден
    echo 📋 Создаем .env из env.production...
    copy env.production .env
    echo ⚠️  ВАЖНО: Отредактируйте файл .env и измените пароли!
    echo    notepad .env
    echo.
    pause
)

REM Загружаем переменные окружения из .env файла
echo 📋 Загружаем переменные окружения...
for /f "usebackq tokens=1,2 delims==" %%a in (".env") do (
    if not "%%a"=="" if not "%%a:~0,1%"=="#" (
        set "%%a=%%b"
    )
)

REM Проверяем обязательные переменные
echo 🔍 Проверяем переменные окружения...

if "%POSTGRES_PASSWORD%"=="" (
    echo ❌ POSTGRES_PASSWORD не установлен
    echo    Отредактируйте файл .env и установите пароль для PostgreSQL
    exit /b 1
)

if "%JWT_SECRET%"=="" (
    echo ❌ JWT_SECRET не установлен
    echo    Отредактируйте файл .env и установите секретный ключ для JWT
    exit /b 1
)

if "%CORS_ORIGIN%"=="" (
    echo ❌ CORS_ORIGIN не установлен
    echo    Отредактируйте файл .env и установите домен
    exit /b 1
)

echo ✅ Переменные окружения настроены корректно

REM Останавливаем существующие контейнеры
echo 🛑 Останавливаем существующие контейнеры...
docker-compose -f docker-compose.prod.yml down --remove-orphans

REM Удаляем старые образы (опционально)
echo 🧹 Очищаем старые образы...
docker system prune -f

REM Собираем новые образы
echo 🔨 Собираем новые образы...
docker-compose -f docker-compose.prod.yml build --no-cache

REM Запускаем сервисы
echo ▶️ Запускаем сервисы...
docker-compose -f docker-compose.prod.yml up -d

REM Ждем запуска базы данных
echo ⏳ Ждем запуска базы данных...
timeout /t 30 /nobreak > nul

REM Проверяем статус сервисов
echo 🔍 Проверяем статус сервисов...
docker-compose -f docker-compose.prod.yml ps

REM Проверяем логи
echo 📋 Проверяем логи...
docker-compose -f docker-compose.prod.yml logs --tail=50

REM Проверяем health check
echo 🏥 Проверяем health check...
timeout /t 10 /nobreak > nul

curl -f http://localhost/api/health > nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Health check прошел успешно
) else (
    echo ❌ Health check не прошел
    echo 📋 Логи backend:
    docker-compose -f docker-compose.prod.yml logs backend
    exit /b 1
)

echo.
echo 🎉 Деплой завершен успешно!
echo 🌐 Приложение доступно по адресу: %CORS_ORIGIN%
echo 📊 Мониторинг: docker-compose -f docker-compose.prod.yml logs -f
echo.
echo 📋 Полезные команды:
echo    Статус сервисов: docker-compose -f docker-compose.prod.yml ps
echo    Логи: docker-compose -f docker-compose.prod.yml logs -f
echo    Health check: curl http://localhost/api/health
echo    Резервная копия: scripts\backup.bat
echo.
pause
