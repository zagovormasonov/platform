# Руководство по развертыванию на Timeweb Cloud

Это руководство поможет вам развернуть платформу на сервере Timeweb Cloud с использованием PostgreSQL базы данных.

## Требования

- Сервер с Ubuntu 20.04+ или CentOS 8+
- Docker и Docker Compose
- Минимум 2GB RAM, 2 CPU cores, 20GB дискового пространства
- Домен (опционально, для SSL)

## Подготовка сервера

### 1. Обновление системы

```bash
# Ubuntu/Debian
sudo apt update && sudo apt upgrade -y

# CentOS/RHEL
sudo yum update -y
```

### 2. Установка Docker

```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# CentOS/RHEL
sudo yum install -y docker
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER
```

### 3. Установка Docker Compose

```bash
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 4. Перезагрузка для применения изменений

```bash
sudo reboot
```

## Развертывание приложения

### 1. Клонирование репозитория

```bash
git clone <your-repository-url>
cd platform
```

### 2. Настройка переменных окружения

Скопируйте файл с переменными окружения:

```bash
cp env.production .env
```

Отредактируйте файл `.env`:

```bash
nano .env
```

Обязательно измените следующие переменные:

```env
# Безопасный пароль для PostgreSQL
POSTGRES_PASSWORD=your_very_secure_password_here

# Секретный ключ для JWT (сгенерируйте случайную строку)
JWT_SECRET=your_very_secure_jwt_secret_key_here

# Ваш домен
CORS_ORIGIN=https://your-domain.com
VITE_API_URL=https://your-domain.com/api
VITE_SOCKETIO_URL=https://your-domain.com:3002
```

### 3. Настройка SSL сертификатов (рекомендуется)

Если у вас есть SSL сертификаты, поместите их в директорию `nginx/ssl/`:

```bash
mkdir -p nginx/ssl
# Поместите cert.pem и key.pem в эту директорию
```

Для автоматического получения SSL сертификатов используйте Let's Encrypt:

```bash
# Установка Certbot
sudo apt install certbot -y

# Получение сертификата
sudo certbot certonly --standalone -d your-domain.com

# Копирование сертификатов
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem nginx/ssl/key.pem
sudo chown $USER:$USER nginx/ssl/*
```

### 4. Запуск приложения

```bash
# Сделайте скрипт исполняемым
chmod +x scripts/deploy.sh

# Запустите деплой
./scripts/deploy.sh
```

### 5. Проверка работы

После успешного деплоя проверьте:

```bash
# Статус контейнеров
docker-compose -f docker-compose.prod.yml ps

# Логи
docker-compose -f docker-compose.prod.yml logs -f

# Health check
curl http://localhost/api/health
```

## Настройка файрвола

```bash
# Ubuntu/Debian
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable

# CentOS/RHEL
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

## Мониторинг и обслуживание

### Просмотр логов

```bash
# Все сервисы
docker-compose -f docker-compose.prod.yml logs -f

# Конкретный сервис
docker-compose -f docker-compose.prod.yml logs -f backend
```

### Создание резервных копий

```bash
# Сделайте скрипт исполняемым
chmod +x scripts/backup.sh

# Создание резервной копии
./scripts/backup.sh
```

### Восстановление из резервной копии

```bash
# Сделайте скрипт исполняемым
chmod +x scripts/restore.sh

# Восстановление
./scripts/restore.sh backups/platform_backup_20240101_120000.sql.gz
```

### Обновление приложения

```bash
# Остановка сервисов
docker-compose -f docker-compose.prod.yml down

# Обновление кода
git pull origin main

# Пересборка и запуск
./scripts/deploy.sh
```

## Настройка автоматических резервных копий

Добавьте в crontab:

```bash
crontab -e
```

Добавьте строку для ежедневного бэкапа в 2:00:

```bash
0 2 * * * /path/to/platform/scripts/backup.sh
```

## Настройка мониторинга

### Установка htop для мониторинга ресурсов

```bash
sudo apt install htop -y
htop
```

### Настройка логирования

Логи автоматически сохраняются в директории `nginx/logs/`.

## Устранение неполадок

### Проблемы с подключением к базе данных

```bash
# Проверка статуса PostgreSQL
docker-compose -f docker-compose.prod.yml exec postgres pg_isready -U platform_user

# Подключение к базе данных
docker-compose -f docker-compose.prod.yml exec postgres psql -U platform_user -d platform_db
```

### Проблемы с SSL

```bash
# Проверка сертификатов
openssl x509 -in nginx/ssl/cert.pem -text -noout

# Тест SSL
openssl s_client -connect your-domain.com:443
```

### Очистка дискового пространства

```bash
# Удаление неиспользуемых образов
docker system prune -a

# Удаление неиспользуемых томов
docker volume prune
```

## Безопасность

### Рекомендации по безопасности

1. **Измените пароли по умолчанию** в файле `.env`
2. **Используйте сильные пароли** (минимум 16 символов)
3. **Регулярно обновляйте** Docker образы
4. **Настройте автоматические резервные копии**
5. **Мониторьте логи** на предмет подозрительной активности
6. **Используйте SSL сертификаты** для всех соединений

### Настройка fail2ban

```bash
# Установка
sudo apt install fail2ban -y

# Настройка
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

## Поддержка

При возникновении проблем:

1. Проверьте логи: `docker-compose -f docker-compose.prod.yml logs`
2. Проверьте статус сервисов: `docker-compose -f docker-compose.prod.yml ps`
3. Проверьте использование ресурсов: `htop`
4. Проверьте подключение к базе данных
5. Проверьте настройки файрвола

## Обновление

Для обновления приложения:

```bash
# Создайте резервную копию
./scripts/backup.sh

# Обновите код
git pull origin main

# Перезапустите приложение
./scripts/deploy.sh
```
