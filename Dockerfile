# Многоэтапная сборка для оптимизации размера
FROM node:18-alpine AS builder

# Установка рабочей директории
WORKDIR /app

# Копирование package.json и package-lock.json
COPY package*.json ./

# Установка зависимостей
RUN npm ci

# Копирование исходного кода
COPY . .

# Аргументы для переменных окружения
ARG VITE_API_URL
ARG VITE_SOCKETIO_URL

# Установка переменных окружения для сборки
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_SOCKETIO_URL=$VITE_SOCKETIO_URL

# Сборка приложения
RUN npm run build

# Production этап
FROM nginx:alpine AS production

# Копирование собранного приложения
COPY --from=builder /app/dist /usr/share/nginx/html

# Копирование конфигурации nginx
COPY nginx.conf /etc/nginx/nginx.conf

# Открытие порта 80
EXPOSE 80

# Запуск nginx
CMD ["nginx", "-g", "daemon off;"]
