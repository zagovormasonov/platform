@echo off
setlocal enabledelayedexpansion

echo 💾 Создаем резервную копию базы данных...

REM Создаем директорию для бэкапов
if not exist "backups" mkdir backups

REM Получаем текущую дату и время
for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "dt=%%a"
set "YY=%dt:~2,2%" & set "YYYY=%dt:~0,4%" & set "MM=%dt:~4,2%" & set "DD=%dt:~6,2%"
set "HH=%dt:~8,2%" & set "Min=%dt:~10,2%" & set "Sec=%dt:~12,2%"
set "timestamp=%YYYY%%MM%%DD%_%HH%%Min%%Sec%"

set "BACKUP_FILE=backups\platform_backup_%timestamp%.sql"

REM Загружаем переменные окружения
for /f "usebackq tokens=1,2 delims==" %%a in (".env") do (
    if not "%%a"=="" if not "%%a:~0,1%"=="#" (
        set "%%a=%%b"
    )
)

REM Создаем резервную копию
echo 📦 Создаем резервную копию PostgreSQL...
docker-compose -f docker-compose.prod.yml exec -T postgres pg_dump -U platform_user -d platform_db --clean --if-exists --create > "%BACKUP_FILE%"

if %errorlevel% equ 0 (
    echo ✅ Резервная копия создана: %BACKUP_FILE%
    
    REM Сжимаем резервную копию (если доступен gzip)
    gzip "%BACKUP_FILE%" 2>nul
    if %errorlevel% equ 0 (
        echo ✅ Резервная копия сжата: %BACKUP_FILE%.gz
    ) else (
        echo ⚠️  gzip не найден. Резервная копия не сжата.
    )
) else (
    echo ❌ Ошибка создания резервной копии
    exit /b 1
)

REM Удаляем старые резервные копии (старше 7 дней)
echo 🧹 Удаляем старые резервные копии...
forfiles /p backups /m platform_backup_*.sql* /d -7 /c "cmd /c del @path" 2>nul

echo ✅ Готово!
pause
