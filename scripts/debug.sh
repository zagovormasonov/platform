#!/bin/bash

echo "🔍 Диагностика проблем с платформой"
echo "=================================="

echo "📋 Статус контейнеров:"
docker-compose -f docker-compose.prod.yml ps

echo ""
echo "📋 Логи backend:"
docker-compose -f docker-compose.prod.yml logs backend --tail=10

echo ""
echo "📋 Логи socketio:"
docker-compose -f docker-compose.prod.yml logs socketio --tail=10

echo ""
echo "📋 Логи postgres:"
docker-compose -f docker-compose.prod.yml logs postgres --tail=5

echo ""
echo "📋 Логи nginx:"
docker-compose -f docker-compose.prod.yml logs nginx --tail=5

echo ""
echo "📋 Проверка портов:"
netstat -tlnp | grep -E ":(3001|3002|8080|5432)"

echo ""
echo "📋 Проверка переменных окружения:"
echo "POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:0:10}..."
echo "JWT_SECRET: ${JWT_SECRET:0:10}..."
echo "CORS_ORIGIN: $CORS_ORIGIN"

echo ""
echo "📋 Тест подключения к базе данных:"
docker-compose -f docker-compose.prod.yml exec -T postgres psql -U platform_user -d platform_db -c "SELECT 1;" 2>/dev/null && echo "✅ База данных доступна" || echo "❌ Проблема с базой данных"

echo ""
echo "📋 Тест backend API:"
curl -s http://localhost:3001/api/health && echo "✅ Backend API доступен" || echo "❌ Backend API недоступен"

echo ""
echo "📋 Тест nginx:"
curl -s -I http://localhost:8080 && echo "✅ Nginx доступен" || echo "❌ Nginx недоступен"
