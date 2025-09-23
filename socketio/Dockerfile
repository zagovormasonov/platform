FROM node:18-alpine

# Установка рабочей директории
WORKDIR /app

# Копирование package.json
COPY package*.json ./

# Установка зависимостей
RUN npm install --omit=dev

# Копирование исходного кода
COPY . .

# Создание пользователя для безопасности
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Изменение владельца файлов
RUN chown -R nodejs:nodejs /app
USER nodejs

# Открытие порта
EXPOSE 3002

# Запуск приложения
CMD ["npm", "start"]
