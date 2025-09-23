import express from 'express';
import { body, validationResult, query as queryValidator } from 'express-validator';
import { query } from '../config/database.js';

const router = express.Router();

// Валидация для запроса дружбы
const friendshipValidation = [
  body('friend_id').isUUID().withMessage('Некорректный ID пользователя')
];

// Получение списка друзей
router.get('/', [
  queryValidator('status').optional().isIn(['pending', 'accepted', 'rejected']).withMessage('Некорректный статус')
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

    const status = req.query.status;

    let whereClause = 'WHERE (f.user_id = $1 OR f.friend_id = $1)';
    let queryParams = [req.user.id];
    let paramCount = 2;

    if (status) {
      whereClause += ` AND f.status = $${paramCount++}`;
      queryParams.push(status);
    }

    const result = await query(
      `SELECT f.id, f.status, f.created_at, f.updated_at,
              CASE 
                WHEN f.user_id = $1 THEN f.friend_id
                ELSE f.user_id
              END as friend_id,
              CASE 
                WHEN f.user_id = $1 THEN p2.full_name
                ELSE p1.full_name
              END as friend_name,
              CASE 
                WHEN f.user_id = $1 THEN p2.avatar_url
                ELSE p1.avatar_url
              END as friend_avatar
       FROM friendships f
       LEFT JOIN profiles p1 ON f.user_id = p1.id
       LEFT JOIN profiles p2 ON f.friend_id = p2.id
       ${whereClause}
       ORDER BY f.updated_at DESC`,
      queryParams
    );

    res.json({
      friendships: result.rows
    });

  } catch (error) {
    console.error('Ошибка получения списка друзей:', error);
    res.status(500).json({
      error: 'Внутренняя ошибка сервера'
    });
  }
});

// Отправка запроса в друзья
router.post('/request', friendshipValidation, async (req, res) => {
  try {
    // Проверка ошибок валидации
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Ошибка валидации',
        details: errors.array()
      });
    }

    const { friend_id } = req.body;

    // Проверка, что пользователь не пытается добавить себя в друзья
    if (friend_id === req.user.id) {
      return res.status(400).json({
        error: 'Нельзя добавить себя в друзья'
      });
    }

    // Проверка существования пользователя
    const friendExists = await query(
      'SELECT id FROM profiles WHERE id = $1',
      [friend_id]
    );

    if (friendExists.rows.length === 0) {
      return res.status(404).json({
        error: 'Пользователь не найден'
      });
    }

    // Проверка существования запроса дружбы
    const existingFriendship = await query(
      `SELECT id, status FROM friendships 
       WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)`,
      [req.user.id, friend_id]
    );

    if (existingFriendship.rows.length > 0) {
      const friendship = existingFriendship.rows[0];
      if (friendship.status === 'pending') {
        return res.status(409).json({
          error: 'Запрос в друзья уже отправлен'
        });
      } else if (friendship.status === 'accepted') {
        return res.status(409).json({
          error: 'Пользователи уже являются друзьями'
        });
      }
    }

    // Создание запроса в друзья
    const result = await query(
      `INSERT INTO friendships (id, user_id, friend_id, status, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, 'pending', NOW(), NOW())
       RETURNING id, status, created_at`,
      [req.user.id, friend_id]
    );

    res.status(201).json({
      message: 'Запрос в друзья отправлен',
      friendship: result.rows[0]
    });

  } catch (error) {
    console.error('Ошибка отправки запроса в друзья:', error);
    res.status(500).json({
      error: 'Внутренняя ошибка сервера'
    });
  }
});

// Принятие/отклонение запроса в друзья
router.patch('/:id/respond', [
  body('status').isIn(['accepted', 'rejected']).withMessage('Статус должен быть accepted или rejected')
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

    const { id } = req.params;
    const { status } = req.body;

    // Проверка существования запроса и прав доступа
    const existingFriendship = await query(
      'SELECT id, status FROM friendships WHERE id = $1 AND friend_id = $2',
      [id, req.user.id]
    );

    if (existingFriendship.rows.length === 0) {
      return res.status(404).json({
        error: 'Запрос в друзья не найден'
      });
    }

    if (existingFriendship.rows[0].status !== 'pending') {
      return res.status(400).json({
        error: 'Запрос уже обработан'
      });
    }

    // Обновление статуса
    const result = await query(
      `UPDATE friendships SET status = $1, updated_at = NOW() 
       WHERE id = $2 
       RETURNING id, status, updated_at`,
      [status, id]
    );

    res.json({
      message: `Запрос в друзья ${status === 'accepted' ? 'принят' : 'отклонен'}`,
      friendship: result.rows[0]
    });

  } catch (error) {
    console.error('Ошибка обработки запроса в друзья:', error);
    res.status(500).json({
      error: 'Внутренняя ошибка сервера'
    });
  }
});

// Удаление из друзей
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Проверка существования дружбы и прав доступа
    const existingFriendship = await query(
      'SELECT id FROM friendships WHERE id = $1 AND (user_id = $2 OR friend_id = $2)',
      [id, req.user.id]
    );

    if (existingFriendship.rows.length === 0) {
      return res.status(404).json({
        error: 'Дружба не найдена'
      });
    }

    await query(
      'DELETE FROM friendships WHERE id = $1',
      [id]
    );

    res.json({
      message: 'Пользователь удален из друзей'
    });

  } catch (error) {
    console.error('Ошибка удаления из друзей:', error);
    res.status(500).json({
      error: 'Внутренняя ошибка сервера'
    });
  }
});

export default router;
