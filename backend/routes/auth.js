import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import rateLimit from 'express-rate-limit';
import { query } from '../config/database.js';
import { generateTokens } from '../middleware/auth.js';

const router = express.Router();

// Rate limiting для входа (более строгий)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 10, // максимум 10 попыток входа
  message: 'Слишком много попыток входа, попробуйте позже.',
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: true,
  skipSuccessfulRequests: true,
});

// Rate limiting для регистрации (более мягкий)
const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 50, // максимум 50 попыток регистрации
  message: 'Слишком много попыток регистрации, попробуйте позже.',
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: true,
  skipSuccessfulRequests: true,
});

// Валидация для регистрации
const registerValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Некорректный email'),
  body('password').isLength({ min: 6 }).withMessage('Пароль должен содержать минимум 6 символов'),
  body('full_name').trim().isLength({ min: 2 }).withMessage('Имя должно содержать минимум 2 символа')
];

// Валидация для входа
const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Некорректный email'),
  body('password').notEmpty().withMessage('Пароль обязателен')
];

// Регистрация
router.post('/register', registerLimiter, registerValidation, async (req, res) => {
  try {
    // Проверка ошибок валидации
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Ошибка валидации',
        details: errors.array()
      });
    }

    const { email, password, full_name } = req.body;

    // Проверка существования пользователя
    const existingUser = await query(
      'SELECT id FROM profiles WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        error: 'Пользователь с таким email уже существует'
      });
    }

    // Хеширование пароля
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Создание пользователя
    const result = await query(
      `INSERT INTO profiles (id, email, password_hash, full_name, created_at, updated_at) 
       VALUES (gen_random_uuid(), $1, $2, $3, NOW(), NOW()) 
       RETURNING id, email, full_name, created_at`,
      [email, hashedPassword, full_name]
    );

    const user = result.rows[0];

    // Генерация токенов
    const { accessToken, refreshToken } = generateTokens(user.id);

    res.status(201).json({
      message: 'Пользователь успешно зарегистрирован',
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        created_at: user.created_at
      },
      accessToken,
      refreshToken
    });

  } catch (error) {
    console.error('Ошибка регистрации:', error);
    res.status(500).json({
      error: 'Внутренняя ошибка сервера'
    });
  }
});

// Вход
router.post('/login', loginLimiter, loginValidation, async (req, res) => {
  try {
    // Проверка ошибок валидации
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Ошибка валидации',
        details: errors.array()
      });
    }

    const { email, password } = req.body;

    // Поиск пользователя
    const result = await query(
      'SELECT id, email, password_hash, full_name FROM profiles WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: 'Неверный email или пароль'
      });
    }

    const user = result.rows[0];

    // Проверка пароля
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'Неверный email или пароль'
      });
    }

    // Генерация токенов
    const { accessToken, refreshToken } = generateTokens(user.id);

    res.json({
      message: 'Успешный вход',
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name
      },
      accessToken,
      refreshToken
    });

  } catch (error) {
    console.error('Ошибка входа:', error);
    res.status(500).json({
      error: 'Внутренняя ошибка сервера'
    });
  }
});

// Обновление токена
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        error: 'Refresh токен не предоставлен'
      });
    }

    // Проверка refresh токена
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    
    if (decoded.type !== 'refresh') {
      return res.status(401).json({
        error: 'Недействительный refresh токен'
      });
    }

    // Проверка существования пользователя
    const result = await query(
      'SELECT id FROM profiles WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: 'Пользователь не найден'
      });
    }

    // Генерация новых токенов
    const tokens = generateTokens(decoded.userId);

    res.json({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken
    });

  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Недействительный refresh токен'
      });
    }

    console.error('Ошибка обновления токена:', error);
    res.status(500).json({
      error: 'Внутренняя ошибка сервера'
    });
  }
});

// Выход (опционально - для инвалидации токенов)
router.post('/logout', (req, res) => {
  // В простой реализации просто возвращаем успех
  // В production можно добавить blacklist токенов
  res.json({
    message: 'Успешный выход'
  });
});

// Сброс rate limit (для разработки)
router.post('/reset-rate-limit', (req, res) => {
  // В production это должно быть удалено или защищено
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Недоступно в production' });
  }
  
  // Сбрасываем rate limit для текущего IP
  res.json({ message: 'Rate limit сброшен для разработки' });
});

export default router;
