# Обновление сервера для нового адреса http://217.149.31.228

## 1. Обновление переменных окружения

### На сервере выполните:

```bash
# Перейдите в директорию проекта
cd ~/platform

# Обновите переменные окружения
cp env.production.remote .env

# Проверьте содержимое .env
cat .env
```

Должно быть:
```
CORS_ORIGIN=http://217.149.31.228
VITE_API_URL=http://217.149.31.228/api
VITE_SOCKETIO_URL=http://217.149.31.228/socket.io
```

## 2. Обновление конфигурации Nginx

### Если используете Docker:
```bash
# Обновите конфигурацию Nginx
cp nginx/nginx.prod.conf.new nginx/nginx.prod.conf

# Перезапустите контейнеры
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d
```

### Если используете PM2 (без Docker):
```bash
# Обновите конфигурацию Nginx
sudo cp nginx/nginx.prod.conf.new /etc/nginx/sites-available/platform

# Проверьте конфигурацию
sudo nginx -t

# Перезагрузите Nginx
sudo systemctl reload nginx

# Перезапустите приложения
pm2 restart all
```

## 3. Применение миграции базы данных

```bash
# Подключитесь к PostgreSQL и выполните миграцию
psql -h localhost -U platform_user -d platform_db -f database/migration_add_missing_fields.sql
```

## 4. Пересборка и перезапуск

```bash
# Пересоберите frontend
npm run build

# Перезапустите процессы
pm2 restart backend
pm2 restart frontend
pm2 restart socketio

# Проверьте статус
pm2 status
pm2 logs backend
pm2 logs frontend
```

## 5. Проверка работы

### Проверьте доступность:
- http://217.149.31.228/ - главная страница
- http://217.149.31.228/api/health - health check API
- http://217.149.31.228/socket.io/ - Socket.IO endpoint

### Проверьте логи:
```bash
# Логи Nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Логи PM2
pm2 logs backend
pm2 logs frontend
pm2 logs socketio
```

## 6. Если проблемы

### Проверьте файрвол:
```bash
# Откройте порты 80 и 443
sudo ufw allow 80
sudo ufw allow 443
sudo ufw status
```

### Проверьте DNS:
```bash
# Убедитесь, что домен указывает на правильный IP
nslookup 217.149.31.228
```

### Проверьте SSL (если нужен):
```bash
# Для HTTPS нужно настроить SSL сертификаты
# Пока используйте HTTP
```
