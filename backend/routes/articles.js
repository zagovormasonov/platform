import express from 'express';
import { body, validationResult } from 'express-validator';
import { query } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Валидация для создания статьи
const createArticleValidation = [
  body('title').trim().isLength({ min: 1, max: 500 }).withMessage('Заголовок должен быть от 1 до 500 символов'),
  body('content').trim().isLength({ min: 1 }).withMessage('Содержание статьи не может быть пустым'),
  body('published').optional().isBoolean().withMessage('Поле published должно быть булевым'),
  body('image_url').optional().custom((value) => {
    if (value && value.trim() !== '') {
      try {
        new URL(value);
        return true;
      } catch {
        throw new Error('Некорректный URL изображения');
      }
    }
    return true;
  }),
  body('tags').optional().isArray().withMessage('Теги должны быть массивом')
];

// Валидация для обновления статьи
const updateArticleValidation = [
  body('title').optional().trim().isLength({ min: 1, max: 500 }).withMessage('Заголовок должен быть от 1 до 500 символов'),
  body('content').optional().trim().isLength({ min: 1 }).withMessage('Содержание статьи не может быть пустым'),
  body('published').optional().isBoolean().withMessage('Поле published должно быть булевым'),
  body('image_url').optional().custom((value) => {
    if (value && value.trim() !== '') {
      try {
        new URL(value);
        return true;
      } catch {
        throw new Error('Некорректный URL изображения');
      }
    }
    return true;
  }),
  body('tags').optional().isArray().withMessage('Теги должны быть массивом')
];

// Создание новой статьи
router.post('/', authenticateToken, createArticleValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Ошибка валидации', details: errors.array() });
    }

    const { title, content, published = false, image_url, tags } = req.body;

    const result = await query(
      `INSERT INTO articles (title, content, author_id, published, image_url, tags, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       RETURNING *`,
      [title, content, req.user.id, published, image_url, tags]
    );

    res.status(201).json({ message: 'Статья успешно создана', data: result.rows[0] });

  } catch (error) {
    console.error('Ошибка создания статьи:', error);
    console.error('Детали ошибки:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      hint: error.hint
    });
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Получение всех статей пользователя
router.get('/my', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      `SELECT * FROM articles WHERE author_id = $1 ORDER BY created_at DESC`,
      [req.user.id]
    );

    res.json({ data: result.rows });
  } catch (error) {
    console.error('Ошибка получения статей:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Обновление статьи
router.put('/:id', authenticateToken, updateArticleValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Ошибка валидации', details: errors.array() });
    }

    const { id } = req.params;
    const { title, content, published, image_url, tags } = req.body;

    // Проверяем, что статья принадлежит пользователю
    const articleCheck = await query('SELECT author_id FROM articles WHERE id = $1', [id]);
    if (articleCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Статья не найдена' });
    }
    if (articleCheck.rows[0].author_id !== req.user.id) {
      return res.status(403).json({ error: 'Недостаточно прав для редактирования этой статьи' });
    }

    const result = await query(
      `UPDATE articles SET title = $1, content = $2, published = $3, image_url = $4, tags = $5, updated_at = NOW()
       WHERE id = $6 RETURNING *`,
      [title, content, published, image_url, tags, id]
    );

    res.json({ message: 'Статья успешно обновлена', data: result.rows[0] });

  } catch (error) {
    console.error('Ошибка обновления статьи:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Удаление статьи
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Проверяем, что статья принадлежит пользователю
    const articleCheck = await query('SELECT author_id FROM articles WHERE id = $1', [id]);
    if (articleCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Статья не найдена' });
    }
    if (articleCheck.rows[0].author_id !== req.user.id) {
      return res.status(403).json({ error: 'Недостаточно прав для удаления этой статьи' });
    }

    await query('DELETE FROM articles WHERE id = $1', [id]);

    res.json({ message: 'Статья успешно удалена' });

  } catch (error) {
    console.error('Ошибка удаления статьи:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

export default router;