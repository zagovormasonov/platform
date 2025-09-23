# 🐳 Решение проблемы с Docker Hub Rate Limit

## Проблема
```
toomanyrequests: You have reached your unauthenticated pull rate limit. 
https://www.docker.com/increase-rate-limit
```

## Решения

### 1. 🔑 Войти в Docker Hub (Рекомендуется)

1. **Создайте аккаунт на Docker Hub** (если нет):
   - Перейдите на https://hub.docker.com
   - Нажмите "Sign Up" и создайте бесплатный аккаунт

2. **Войдите в Docker Desktop**:
   - Откройте Docker Desktop
   - Нажмите на иконку профиля в правом верхнем углу
   - Выберите "Sign in"
   - Введите логин и пароль Docker Hub

3. **Или войдите через командную строку**:
   ```cmd
   docker login
   ```
   Введите логин и пароль Docker Hub

### 2. 🔄 Использовать альтернативные реестры

Создайте файл `docker-compose.alt.yml` с альтернативными образами:

```yaml
services:
  postgres:
    image: registry.gitlab.com/library/postgres:15-alpine
    # или
    # image: ghcr.io/library/postgres:15-alpine
    
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    # Используем локальную сборку
    
  frontend:
    build:
      context: .
      dockerfile: Dockerfile
    # Используем локальную сборку
    
  socketio:
    build:
      context: .
      dockerfile: ./socketio/Dockerfile
    # Используем локальную сборку
```

### 3. 🏠 Использовать локальные образы

Скачайте образы заранее:

```cmd
# Скачайте образы по одному
docker pull postgres:15-alpine
docker pull node:18-alpine
docker pull nginx:alpine

# Или используйте скрипт
docker pull postgres:15-alpine && docker pull node:18-alpine && docker pull nginx:alpine
```

### 4. ⏰ Подождать

Лимит Docker Hub сбрасывается каждые 6 часов. Вы можете подождать и попробовать снова.

## 🚀 Рекомендуемый порядок действий

1. **Сначала исправьте файл .env**:
   ```cmd
   fix-env.bat
   ```

2. **Войдите в Docker Hub**:
   ```cmd
   docker login
   ```

3. **Запустите деплой**:
   ```cmd
   scripts\deploy.bat
   ```

## 🔍 Проверка статуса

После входа в Docker Hub проверьте:

```cmd
# Проверьте, что вы вошли
docker system info

# Проверьте лимиты
docker pull hello-world
```

## 📊 Лимиты Docker Hub

- **Неаутентифицированные пользователи**: 100 запросов в 6 часов
- **Аутентифицированные пользователи**: 200 запросов в 6 часов
- **Платные аккаунты**: 5000 запросов в день

## 🆘 Если ничего не помогает

1. **Используйте WSL2** с Linux:
   ```cmd
   wsl --install
   wsl
   # В WSL выполните деплой
   ./scripts/deploy.sh
   ```

2. **Используйте альтернативные реестры**:
   - GitHub Container Registry (ghcr.io)
   - GitLab Container Registry
   - Quay.io

3. **Соберите образы локально** без pull

---

**После входа в Docker Hub деплой должен пройти успешно!** 🎉
