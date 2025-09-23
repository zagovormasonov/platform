@echo off
echo 🔧 Исправляем переменную M в .env файле...

echo # Production Environment Variables > .env
echo. >> .env
echo # Database >> .env
echo POSTGRES_PASSWORD=SecurePassword123! >> .env
echo DATABASE_URL=postgresql://platform_user:SecurePassword123!@postgres:5432/platform_db >> .env
echo. >> .env
echo # JWT >> .env
echo JWT_SECRET=MyVerySecureJWTSecretKey123456789 >> .env
echo. >> .env
echo # CORS >> .env
echo CORS_ORIGIN=http://localhost:8080 >> .env
echo. >> .env
echo # API >> .env
echo VITE_API_URL=http://localhost:8080/api >> .env
echo VITE_SOCKETIO_URL=http://localhost:3002 >> .env
echo. >> .env
echo # Node Environment >> .env
echo NODE_ENV=production >> .env

echo ✅ Файл .env исправлен!
echo.
echo 📋 Содержимое файла .env:
type .env
echo.
pause
