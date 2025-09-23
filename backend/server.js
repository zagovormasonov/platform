import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Импорт маршрутов
import authRoutes from './routes/auth.js';
import profileRoutes from './routes/profile.js';
import articleRoutes from './routes/articles.js';
import friendshipRoutes from './routes/friendships.js';
import notificationRoutes from './routes/notifications.js';

// Импорт middleware
import { authenticateToken } from './middleware/auth.js';
import { errorHandler } from './middleware/errorHandler.js';

// Загрузка переменных окружения
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy для работы за nginx - указываем конкретное количество прокси
app.set('trust proxy', 1);

// Middleware безопасности
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// Rate limiting с правильной настройкой для прокси
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 100, // максимум 100 запросов с одного IP
  message: 'Слишком много запросов с этого IP, попробуйте позже.',
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: true, // Явно указываем, что доверяем прокси
  skip: (req) => {
    // Пропускаем rate limiting для health check
    return req.path === '/api/health';
  }
});
app.use(limiter);

// CORS настройки
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Парсинг JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Статические файлы
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Маршруты API
app.use('/api/auth', authRoutes);
app.use('/api/profile', authenticateToken, profileRoutes);
app.use('/api/articles', authenticateToken, articleRoutes);
app.use('/api/friendships', authenticateToken, friendshipRoutes);
app.use('/api/notifications', authenticateToken, notificationRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Обработка 404
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Маршрут не найден',
    path: req.originalUrl 
  });
});

// Обработка ошибок
app.use(errorHandler);

// Запуск сервера
app.listen(PORT, () => {
  console.log(`🚀 Backend сервер запущен на порту ${PORT}`);
  console.log(`🌐 CORS настроен для: ${process.env.CORS_ORIGIN || 'http://localhost:3000'}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Получен SIGTERM, завершение работы...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Получен SIGINT, завершение работы...');
  process.exit(0);
});

export default app;
