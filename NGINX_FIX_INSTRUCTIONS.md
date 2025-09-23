# Исправление конфигурации Nginx

## Проблема
Nginx не может загрузить конфигурацию из-за ошибок в файле.

## Решение

### 1. Проверьте текущую конфигурацию
```bash
sudo nginx -t
sudo systemctl status nginx.service
journalctl -xeu nginx.service
```

### 2. Создайте правильную конфигурацию
```bash
# Скопируйте новую конфигурацию
sudo cp nginx/platform.conf /etc/nginx/sites-available/platform

# Создайте символическую ссылку (если не существует)
sudo ln -sf /etc/nginx/sites-available/platform /etc/nginx/sites-enabled/platform

# Удалите дефолтную конфигурацию (если мешает)
sudo rm -f /etc/nginx/sites-enabled/default
```

### 3. Проверьте конфигурацию
```bash
sudo nginx -t
```

### 4. Если ошибки остаются, используйте минимальную конфигурацию
```bash
# Создайте минимальную конфигурацию
sudo tee /etc/nginx/sites-available/platform << 'EOF'
server {
    listen 80;
    server_name 217.149.31.228 localhost;
    
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location /socket.io/ {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
EOF

# Активируйте конфигурацию
sudo ln -sf /etc/nginx/sites-available/platform /etc/nginx/sites-enabled/platform
sudo rm -f /etc/nginx/sites-enabled/default

# Проверьте конфигурацию
sudo nginx -t
```

### 5. Перезапустите Nginx
```bash
sudo systemctl reload nginx
# или
sudo systemctl restart nginx
```

### 6. Проверьте статус
```bash
sudo systemctl status nginx
```

### 7. Проверьте логи
```bash
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

## Альтернативное решение (если Nginx не работает)

### Используйте только PM2 без Nginx:
```bash
# Остановите Nginx
sudo systemctl stop nginx
sudo systemctl disable nginx

# Убедитесь, что все сервисы запущены на разных портах
pm2 start backend/server.js --name "backend" -- --port 3001
pm2 start "serve -s dist -l 3000" --name "frontend"
pm2 start socketio/server.js --name "socketio" -- --port 3002

# Проверьте статус
pm2 status
```

### Доступ к приложению:
- Frontend: http://217.149.31.228:3000
- API: http://217.149.31.228:3001/api
- Socket.IO: http://217.149.31.228:3002

## Проверка работы
```bash
# Проверьте доступность портов
netstat -tlnp | grep -E ':(80|3000|3001|3002)'

# Проверьте процессы
ps aux | grep -E '(nginx|node|serve)'

# Проверьте PM2
pm2 status
pm2 logs
```
