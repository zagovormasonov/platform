import jwt from 'jsonwebtoken';
import { query } from '../config/database.js';

// Middleware для аутентификации
export const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ 
      error: 'Токен доступа не предоставлен' 
    });
  }

  try {
    // Проверка токена
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Проверка существования пользователя в базе данных
    const result = await query(
      'SELECT id, email, full_name FROM profiles WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ 
        error: 'Пользователь не найден' 
      });
    }

    // Добавление информации о пользователе в запрос
    req.user = result.rows[0];
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Токен истек' 
      });
    } else if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Недействительный токен' 
      });
    } else {
      console.error('Ошибка аутентификации:', error);
      return res.status(500).json({ 
        error: 'Внутренняя ошибка сервера' 
      });
    }
  }
};

// Middleware для проверки прав доступа к ресурсу
export const checkResourceAccess = (resourceUserIdField = 'author_id') => {
  return (req, res, next) => {
    const resourceUserId = req.params[resourceUserIdField] || req.body[resourceUserIdField];
    
    if (req.user.id !== resourceUserId) {
      return res.status(403).json({ 
        error: 'Доступ запрещен' 
      });
    }
    
    next();
  };
};

// Функция для генерации токенов
export const generateTokens = (userId) => {
  const accessToken = jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );

  const refreshToken = jwt.sign(
    { userId, type: 'refresh' },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  return { accessToken, refreshToken };
};
