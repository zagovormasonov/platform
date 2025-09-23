# 🚀 Платформа духовного опыта - Развертывание на Timeweb Cloud

Полное руководство по переносу проекта с Supabase на собственный сервер Timeweb Cloud с PostgreSQL.

## 📋 Что было сделано

### ✅ Завершенные задачи:

1. **Анализ проекта** - Изучена структура и зависимости
2. **Docker конфигурация** - Создана полная контейнеризация
3. **PostgreSQL база данных** - Настроена схема и миграции
4. **Backend API** - Создан Node.js API для замены Supabase
5. **Обновление фронтенда** - Адаптирован для работы с новым API
6. **Скрипты деплоя** - Автоматизация развертывания
7. **Production конфигурация** - Настройки для продакшена
8. **Документация** - Подробные инструкции

## 🏗️ Архитектура решения

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API   │    │   Socket.IO     │
│   (React/Vite)  │◄──►│   (Node.js)     │◄──►│   (Real-time)   │
│   Port: 80      │    │   Port: 3001    │    │   Port: 3002    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   PostgreSQL    │
                    │   Port: 5432    │
                    └─────────────────┘
```

## 🛠️ Технологический стек

### Backend:
- **Node.js** + Express.js
- **PostgreSQL** - основная база данных
- **JWT** - аутентификация
- **Socket.IO** - real-time коммуникация
- **Multer** - загрузка файлов
- **Bcrypt** - хеширование паролей

### Frontend:
- **React 18** + TypeScript
- **Vite** - сборщик
- **Tailwind CSS** - стилизация
- **React Router** - маршрутизация

### Infrastructure:
- **Docker** + Docker Compose
- **Nginx** - reverse proxy
- **SSL/TLS** - шифрование

## 📁 Структура проекта

```
platform/
├── backend/                 # Node.js API сервер
│   ├── config/             # Конфигурация БД
│   ├── middleware/         # Middleware функции
│   ├── routes/             # API маршруты
│   ├── uploads/            # Загруженные файлы
│   ├── Dockerfile          # Docker образ backend
│   └── package.json        # Зависимости backend
├── socketio/               # Socket.IO сервер
│   ├── config/             # Конфигурация БД
│   ├── Dockerfile          # Docker образ Socket.IO
│   └── package.json        # Зависимости Socket.IO
├── database/               # SQL скрипты
│   └── init.sql            # Инициализация БД
├── nginx/                  # Nginx конфигурация
│   └── nginx.prod.conf     # Production конфиг
├── scripts/                # Скрипты автоматизации
│   ├── deploy.sh           # Деплой
│   ├── backup.sh           # Резервное копирование
│   └── restore.sh          # Восстановление
├── src/                    # Frontend код
├── docker-compose.yml      # Development
├── docker-compose.prod.yml # Production
├── Dockerfile              # Frontend образ
└── DEPLOYMENT.md           # Подробная документация
```

## 🚀 Быстрый старт

### 1. Подготовка сервера

```bash
# Обновление системы
sudo apt update && sudo apt upgrade -y

# Установка Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Установка Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Перезагрузка
sudo reboot
```

### 2. Клонирование и настройка

```bash
# Клонирование репозитория
git clone <your-repository-url>
cd platform

# Настройка переменных окружения
cp env.production .env
nano .env  # Отредактируйте переменные
```

### 3. Настройка переменных окружения

Обязательно измените в файле `.env`:

```env
# Безопасный пароль для PostgreSQL
POSTGRES_PASSWORD=your_very_secure_password_here

# Секретный ключ для JWT
JWT_SECRET=your_very_secure_jwt_secret_key_here

# Ваш домен
CORS_ORIGIN=https://your-domain.com
VITE_API_URL=https://your-domain.com/api
VITE_SOCKETIO_URL=https://your-domain.com:3002
```

### 4. Запуск

```bash
# Сделайте скрипты исполняемыми
chmod +x scripts/*.sh

# Запустите деплой
./scripts/deploy.sh
```

## 🔧 Основные команды

### Управление сервисами

```bash
# Запуск всех сервисов
docker-compose -f docker-compose.prod.yml up -d

# Остановка всех сервисов
docker-compose -f docker-compose.prod.yml down

# Просмотр логов
docker-compose -f docker-compose.prod.yml logs -f

# Перезапуск конкретного сервиса
docker-compose -f docker-compose.prod.yml restart backend
```

### Резервное копирование

```bash
# Создание резервной копии
./scripts/backup.sh

# Восстановление из резервной копии
./scripts/restore.sh backups/platform_backup_20240101_120000.sql.gz
```

### Мониторинг

```bash
# Статус контейнеров
docker-compose -f docker-compose.prod.yml ps

# Использование ресурсов
docker stats

# Health check
curl http://localhost/api/health
```

## 🔐 Безопасность

### Обязательные настройки:

1. **Измените пароли** в файле `.env`
2. **Настройте SSL сертификаты**
3. **Настройте файрвол**:
   ```bash
   sudo ufw allow 22/tcp    # SSH
   sudo ufw allow 80/tcp    # HTTP
   sudo ufw allow 443/tcp   # HTTPS
   sudo ufw enable
   ```

### Рекомендации:

- Используйте сильные пароли (минимум 16 символов)
- Регулярно обновляйте Docker образы
- Настройте автоматические резервные копии
- Мониторьте логи на предмет подозрительной активности

## 📊 API Endpoints

### Аутентификация
- `POST /api/auth/register` - Регистрация
- `POST /api/auth/login` - Вход
- `POST /api/auth/refresh` - Обновление токена
- `POST /api/auth/logout` - Выход

### Профили
- `GET /api/profile/me` - Мой профиль
- `GET /api/profile/:id` - Профиль пользователя
- `PUT /api/profile/me` - Обновление профиля
- `POST /api/profile/me/avatar` - Загрузка аватара

### Статьи
- `GET /api/articles` - Список статей
- `GET /api/articles/my` - Мои статьи
- `GET /api/articles/:id` - Статья по ID
- `POST /api/articles` - Создание статьи
- `PUT /api/articles/:id` - Обновление статьи
- `DELETE /api/articles/:id` - Удаление статьи

### Дружба
- `GET /api/friendships` - Список друзей
- `POST /api/friendships/request` - Запрос в друзья
- `PATCH /api/friendships/:id/respond` - Ответ на запрос
- `DELETE /api/friendships/:id` - Удаление из друзей

### Уведомления
- `GET /api/notifications` - Список уведомлений
- `PATCH /api/notifications/:id/read` - Отметка как прочитанное
- `PATCH /api/notifications/read-all` - Отметить все как прочитанные
- `DELETE /api/notifications/:id` - Удаление уведомления

## 🐛 Устранение неполадок

### Проблемы с подключением к БД

```bash
# Проверка статуса PostgreSQL
docker-compose -f docker-compose.prod.yml exec postgres pg_isready -U platform_user

# Подключение к БД
docker-compose -f docker-compose.prod.yml exec postgres psql -U platform_user -d platform_db
```

### Проблемы с SSL

```bash
# Проверка сертификатов
openssl x509 -in nginx/ssl/cert.pem -text -noout

# Тест SSL
openssl s_client -connect your-domain.com:443
```

### Очистка ресурсов

```bash
# Удаление неиспользуемых образов
docker system prune -a

# Удаление неиспользуемых томов
docker volume prune
```

## 📈 Масштабирование

### Горизонтальное масштабирование

Для увеличения нагрузки можно:

1. **Добавить больше backend инстансов**:
   ```yaml
   backend:
     # ... конфигурация
     deploy:
       replicas: 3
   ```

2. **Использовать load balancer** (HAProxy, Nginx)

3. **Настроить Redis** для кеширования и сессий

### Вертикальное масштабирование

Увеличьте ресурсы сервера:
- RAM: минимум 4GB для production
- CPU: минимум 4 cores
- Диск: минимум 50GB SSD

## 📞 Поддержка

При возникновении проблем:

1. Проверьте логи: `docker-compose -f docker-compose.prod.yml logs`
2. Проверьте статус: `docker-compose -f docker-compose.prod.yml ps`
3. Проверьте ресурсы: `htop`
4. Проверьте подключение к БД
5. Проверьте настройки файрвола

## 🎯 Следующие шаги

После успешного развертывания рекомендуется:

1. **Настроить мониторинг** (Prometheus + Grafana)
2. **Настроить логирование** (ELK Stack)
3. **Настроить CI/CD** (GitHub Actions)
4. **Добавить тесты** (Jest, Cypress)
5. **Настроить CDN** для статических файлов

---

## 📄 Лицензия

MIT

---

**🎉 Поздравляем! Ваша платформа успешно развернута на Timeweb Cloud!**
