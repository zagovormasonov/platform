import express from 'express';
import { body, validationResult } from 'express-validator';
import { query } from '../config/database.js';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Настройка multer для загрузки файлов
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads/avatars'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `avatar-${req.user.id}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Разрешены только изображения (JPEG, PNG, GIF, WebP)'));
    }
  }
});

// Валидация для обновления профиля
const updateProfileValidation = [
  body('full_name').optional().trim().isLength({ min: 2 }).withMessage('Имя должно содержать минимум 2 символа'),
  body('bio').optional().trim().isLength({ max: 500 }).withMessage('Биография не должна превышать 500 символов'),
  body('website_url').optional().isURL().withMessage('Некорректный URL сайта'),
  body('github_url').optional().isURL().withMessage('Некорректный URL GitHub'),
  body('linkedin_url').optional().isURL().withMessage('Некорректный URL LinkedIn'),
  body('twitter_url').optional().isURL().withMessage('Некорректный URL Twitter'),
  body('instagram_url').optional().isURL().withMessage('Некорректный URL Instagram'),
  body('telegram_url').optional().isURL().withMessage('Некорректный URL Telegram')
];

// Получение профиля текущего пользователя
router.get('/me', async (req, res) => {
  try {
    const result = await query(
      `SELECT id, email, full_name, avatar_url, bio, website_url, github_url, 
              linkedin_url, twitter_url, instagram_url, telegram_url, created_at, updated_at
       FROM profiles WHERE id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Профиль не найден'
      });
    }

    res.json({
      profile: result.rows[0]
    });

  } catch (error) {
    console.error('Ошибка получения профиля:', error);
    res.status(500).json({
      error: 'Внутренняя ошибка сервера'
    });
  }
});

// Получение профиля по ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT id, email, full_name, avatar_url, bio, website_url, github_url, 
              linkedin_url, twitter_url, instagram_url, telegram_url, created_at, updated_at
       FROM profiles WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Профиль не найден'
      });
    }

    res.json({
      profile: result.rows[0]
    });

  } catch (error) {
    console.error('Ошибка получения профиля:', error);
    res.status(500).json({
      error: 'Внутренняя ошибка сервера'
    });
  }
});

// Обновление профиля
router.put('/me', updateProfileValidation, async (req, res) => {
  try {
    // Проверка ошибок валидации
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Ошибка валидации',
        details: errors.array()
      });
    }

    const {
      full_name,
      bio,
      website_url,
      github_url,
      linkedin_url,
      twitter_url,
      instagram_url,
      telegram_url
    } = req.body;

    // Подготовка полей для обновления
    const updateFields = [];
    const updateValues = [];
    let paramCount = 1;

    if (full_name !== undefined) {
      updateFields.push(`full_name = $${paramCount++}`);
      updateValues.push(full_name);
    }
    if (bio !== undefined) {
      updateFields.push(`bio = $${paramCount++}`);
      updateValues.push(bio);
    }
    if (website_url !== undefined) {
      updateFields.push(`website_url = $${paramCount++}`);
      updateValues.push(website_url);
    }
    if (github_url !== undefined) {
      updateFields.push(`github_url = $${paramCount++}`);
      updateValues.push(github_url);
    }
    if (linkedin_url !== undefined) {
      updateFields.push(`linkedin_url = $${paramCount++}`);
      updateValues.push(linkedin_url);
    }
    if (twitter_url !== undefined) {
      updateFields.push(`twitter_url = $${paramCount++}`);
      updateValues.push(twitter_url);
    }
    if (instagram_url !== undefined) {
      updateFields.push(`instagram_url = $${paramCount++}`);
      updateValues.push(instagram_url);
    }
    if (telegram_url !== undefined) {
      updateFields.push(`telegram_url = $${paramCount++}`);
      updateValues.push(telegram_url);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        error: 'Нет полей для обновления'
      });
    }

    // Добавляем updated_at
    updateFields.push(`updated_at = NOW()`);
    updateValues.push(req.user.id);

    const result = await query(
      `UPDATE profiles SET ${updateFields.join(', ')} 
       WHERE id = $${paramCount} 
       RETURNING id, email, full_name, avatar_url, bio, website_url, github_url, 
                 linkedin_url, twitter_url, instagram_url, telegram_url, created_at, updated_at`,
      updateValues
    );

    res.json({
      message: 'Профиль успешно обновлен',
      profile: result.rows[0]
    });

  } catch (error) {
    console.error('Ошибка обновления профиля:', error);
    res.status(500).json({
      error: 'Внутренняя ошибка сервера'
    });
  }
});

// Загрузка аватара
router.post('/me/avatar', upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'Файл аватара не предоставлен'
      });
    }

    const avatarUrl = `/uploads/avatars/${req.file.filename}`;

    // Обновление URL аватара в базе данных
    const result = await query(
      'UPDATE profiles SET avatar_url = $1, updated_at = NOW() WHERE id = $2 RETURNING avatar_url',
      [avatarUrl, req.user.id]
    );

    res.json({
      message: 'Аватар успешно загружен',
      avatar_url: result.rows[0].avatar_url
    });

  } catch (error) {
    console.error('Ошибка загрузки аватара:', error);
    res.status(500).json({
      error: 'Внутренняя ошибка сервера'
    });
  }
});

// Удаление аватара
router.delete('/me/avatar', async (req, res) => {
  try {
    const result = await query(
      'UPDATE profiles SET avatar_url = NULL, updated_at = NOW() WHERE id = $1 RETURNING id',
      [req.user.id]
    );

    res.json({
      message: 'Аватар успешно удален'
    });

  } catch (error) {
    console.error('Ошибка удаления аватара:', error);
    res.status(500).json({
      error: 'Внутренняя ошибка сервера'
    });
  }
});

export default router;
