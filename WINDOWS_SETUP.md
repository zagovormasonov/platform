# 🪟 Установка Docker на Windows

## Проблема
Docker и Docker Compose не установлены на вашей системе Windows.

## Решение

### 1. Установка Docker Desktop

1. **Скачайте Docker Desktop** с официального сайта:
   - Перейдите на https://www.docker.com/products/docker-desktop
   - Нажмите "Download for Windows"
   - Скачайте установщик `Docker Desktop Installer.exe`

2. **Установите Docker Desktop**:
   - Запустите скачанный установщик
   - Следуйте инструкциям установщика
   - При необходимости перезагрузите компьютер

3. **Запустите Docker Desktop**:
   - Найдите Docker Desktop в меню "Пуск"
   - Запустите приложение
   - Дождитесь полной загрузки (иконка в трее станет зеленой)

### 2. Проверка установки

Откройте PowerShell или Command Prompt и выполните:

```cmd
docker --version
docker-compose --version
```

Если команды работают, Docker установлен корректно.

### 3. Настройка переменных окружения

Перед запуском деплоя необходимо отредактировать файл `.env`:

1. **Откройте файл `.env`** в блокноте:
   ```cmd
   notepad .env
   ```

2. **Измените следующие переменные**:

   ```env
   # Измените пароль для PostgreSQL
   POSTGRES_PASSWORD=MySecurePassword123!
   
   # Измените секретный ключ для JWT
   JWT_SECRET=MyVerySecureJWTSecretKey123456789
   
   # Измените домен (для локального тестирования используйте localhost)
   CORS_ORIGIN=http://localhost
   VITE_API_URL=http://localhost/api
   VITE_SOCKETIO_URL=http://localhost:3002
   ```

3. **Сохраните файл** (Ctrl+S)

### 4. Запуск деплоя

После установки Docker и настройки переменных:

```cmd
# Запустите быстрый старт
quick-start.bat

# Или запустите деплой напрямую
scripts\deploy.bat
```

## Альтернативный способ (если Docker Desktop не подходит)

### Использование WSL2 + Docker

1. **Установите WSL2**:
   ```cmd
   wsl --install
   ```

2. **Установите Docker в WSL2**:
   ```bash
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh
   sudo usermod -aG docker $USER
   ```

3. **Запустите деплой в WSL2**:
   ```bash
   ./scripts/deploy.sh
   ```

## Возможные проблемы

### Проблема: "Docker Desktop не запускается"
**Решение**:
- Убедитесь, что включена виртуализация в BIOS
- Проверьте, что Hyper-V включен в Windows Features
- Перезагрузите компьютер

### Проблема: "WSL2 не установлен"
**Решение**:
```cmd
# Включите WSL
dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart

# Включите виртуальную машину
dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart

# Перезагрузите компьютер
shutdown /r /t 0
```

### Проблема: "Недостаточно памяти"
**Решение**:
- Увеличьте память для Docker Desktop в настройках
- Закройте другие приложения
- Увеличьте виртуальную память Windows

## После успешной установки

1. **Проверьте статус Docker**:
   ```cmd
   docker ps
   ```

2. **Запустите деплой**:
   ```cmd
   quick-start.bat
   ```

3. **Проверьте работу приложения**:
   - Откройте браузер
   - Перейдите на http://localhost
   - Приложение должно загрузиться

## Поддержка

Если у вас возникли проблемы:

1. Проверьте логи Docker Desktop
2. Убедитесь, что все сервисы запущены
3. Проверьте настройки файрвола Windows
4. Обратитесь к документации Docker Desktop

---

**После установки Docker вы сможете успешно развернуть вашу платформу!** 🚀
