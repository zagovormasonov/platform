import express from 'express';
import { body, validationResult, query as queryValidator } from 'express-validator';
import { query } from '../config/database.js';

const router = express.Router();

// Валидация для создания/обновления статьи
const articleValidation = [
  body('title').trim().isLength({ min: 1, max: 200 }).withMessage('Заголовок должен содержать от 1 до 200 символов'),
  body('content').trim().isLength({ min: 1 }).withMessage('Содержимое статьи не может быть пустым'),
  body('published').optional().isBoolean().withMessage('Поле published должно быть булевым значением')
];

// Получение всех опубликованных статей с пагинацией
router.get('/', [
  queryValidator('page').optional().isInt({ min: 1 }).withMessage('Страница должна быть положительным числом'),
  queryValidator('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Лимит должен быть от 1 до 50'),
  queryValidator('author_id').optional().isUUID().withMessage('Некорректный ID автора')
], async (req, res) => {
  try {
    // Проверка ошибок валидации
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Ошибка валидации',
        details: errors.array()
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const authorId = req.query.author_id;

    let whereClause = 'WHERE published = true';
    let queryParams = [];
    let paramCount = 1;

    if (authorId) {
      whereClause += ` AND author_id = $${paramCount++}`;
      queryParams.push(authorId);
    }

    // Получение статей с информацией об авторах
    const articlesResult = await query(
      `SELECT a.id, a.title, a.content, a.published, a.created_at, a.updated_at,
              p.id as author_id, p.full_name as author_name, p.avatar_url as author_avatar
       FROM articles a
       JOIN profiles p ON a.author_id = p.id
       ${whereClause}
       ORDER BY a.created_at DESC
       LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      [...queryParams, limit, offset]
    );

    // Подсчет общего количества статей
    const countResult = await query(
      `SELECT COUNT(*) as total FROM articles a ${whereClause}`,
      queryParams
    );

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    res.json({
      articles: articlesResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Ошибка получения статей:', error);
    res.status(500).json({
      error: 'Внутренняя ошибка сервера'
    });
  }
});

// Получение статей текущего пользователя
router.get('/my', async (req, res) => {
  try {
    const result = await query(
      `SELECT id, title, content, published, created_at, updated_at
       FROM articles 
       WHERE author_id = $1 
       ORDER BY created_at DESC`,
      [req.user.id]
    );

    res.json({
      articles: result.rows
    });

  } catch (error) {
    console.error('Ошибка получения статей пользователя:', error);
    res.status(500).json({
      error: 'Внутренняя ошибка сервера'
    });
  }
});

// Получение статьи по ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT a.id, a.title, a.content, a.published, a.created_at, a.updated_at,
              p.id as author_id, p.full_name as author_name, p.avatar_url as author_avatar
       FROM articles a
       JOIN profiles p ON a.author_id = p.id
       WHERE a.id = $1 AND (a.published = true OR a.author_id = $2)`,
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Статья не найдена'
      });
    }

    res.json({
      article: result.rows[0]
    });

  } catch (error) {
    console.error('Ошибка получения статьи:', error);
    res.status(500).json({
      error: 'Внутренняя ошибка сервера'
    });
  }
});

// Создание новой статьи
router.post('/', articleValidation, async (req, res) => {
  try {
    // Проверка ошибок валидации
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Ошибка валидации',
        details: errors.array()
      });
    }

    const { title, content, published = false } = req.body;

    const result = await query(
      `INSERT INTO articles (id, title, content, author_id, published, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW(), NOW())
       RETURNING id, title, content, published, created_at, updated_at`,
      [title, content, req.user.id, published]
    );

    res.status(201).json({
      message: 'Статья успешно создана',
      article: result.rows[0]
    });

  } catch (error) {
    console.error('Ошибка создания статьи:', error);
    res.status(500).json({
      error: 'Внутренняя ошибка сервера'
    });
  }
});

// Обновление статьи
router.put('/:id', articleValidation, async (req, res) => {
  try {
    // Проверка ошибок валидации
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Ошибка валидации',
        details: errors.array()
      });
    }

    const { id } = req.params;
    const { title, content, published } = req.body;

    // Проверка существования статьи и прав доступа
    const existingArticle = await query(
      'SELECT id FROM articles WHERE id = $1 AND author_id = $2',
      [id, req.user.id]
    );

    if (existingArticle.rows.length === 0) {
      return res.status(404).json({
        error: 'Статья не найдена или у вас нет прав на её редактирование'
      });
    }

    // Подготовка полей для обновления
    const updateFields = [];
    const updateValues = [];
    let paramCount = 1;

    if (title !== undefined) {
      updateFields.push(`title = $${paramCount++}`);
      updateValues.push(title);
    }
    if (content !== undefined) {
      updateFields.push(`content = $${paramCount++}`);
      updateValues.push(content);
    }
    if (published !== undefined) {
      updateFields.push(`published = $${paramCount++}`);
      updateValues.push(published);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        error: 'Нет полей для обновления'
      });
    }

    // Добавляем updated_at и id
    updateFields.push(`updated_at = NOW()`);
    updateValues.push(id);

    const result = await query(
      `UPDATE articles SET ${updateFields.join(', ')} 
       WHERE id = $${paramCount} 
       RETURNING id, title, content, published, created_at, updated_at`,
      updateValues
    );

    res.json({
      message: 'Статья успешно обновлена',
      article: result.rows[0]
    });

  } catch (error) {
    console.error('Ошибка обновления статьи:', error);
    res.status(500).json({
      error: 'Внутренняя ошибка сервера'
    });
  }
});

// Удаление статьи
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Проверка существования статьи и прав доступа
    const existingArticle = await query(
      'SELECT id FROM articles WHERE id = $1 AND author_id = $2',
      [id, req.user.id]
    );

    if (existingArticle.rows.length === 0) {
      return res.status(404).json({
        error: 'Статья не найдена или у вас нет прав на её удаление'
      });
    }

    await query(
      'DELETE FROM articles WHERE id = $1',
      [id]
    );

    res.json({
      message: 'Статья успешно удалена'
    });

  } catch (error) {
    console.error('Ошибка удаления статьи:', error);
    res.status(500).json({
      error: 'Внутренняя ошибка сервера'
    });
  }
});

export default router;
