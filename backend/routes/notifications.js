import express from 'express';
import { query } from '../config/database.js';

const router = express.Router();

// Получение уведомлений пользователя
router.get('/', async (req, res) => {
  try {
    const result = await query(
      `SELECT id, type, title, message, data, read, created_at
       FROM notifications 
       WHERE user_id = $1 
       ORDER BY created_at DESC
       LIMIT 50`,
      [req.user.id]
    );

    res.json({
      notifications: result.rows
    });

  } catch (error) {
    console.error('Ошибка получения уведомлений:', error);
    res.status(500).json({
      error: 'Внутренняя ошибка сервера'
    });
  }
});

// Отметка уведомления как прочитанного
router.patch('/:id/read', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `UPDATE notifications SET read = true, updated_at = NOW() 
       WHERE id = $1 AND user_id = $2 
       RETURNING id, read`,
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Уведомление не найдено'
      });
    }

    res.json({
      message: 'Уведомление отмечено как прочитанное',
      notification: result.rows[0]
    });

  } catch (error) {
    console.error('Ошибка обновления уведомления:', error);
    res.status(500).json({
      error: 'Внутренняя ошибка сервера'
    });
  }
});

// Отметка всех уведомлений как прочитанных
router.patch('/read-all', async (req, res) => {
  try {
    const result = await query(
      `UPDATE notifications SET read = true, updated_at = NOW() 
       WHERE user_id = $1 AND read = false 
       RETURNING COUNT(*) as updated_count`,
      [req.user.id]
    );

    res.json({
      message: 'Все уведомления отмечены как прочитанные',
      updated_count: parseInt(result.rows[0].updated_count)
    });

  } catch (error) {
    console.error('Ошибка обновления уведомлений:', error);
    res.status(500).json({
      error: 'Внутренняя ошибка сервера'
    });
  }
});

// Удаление уведомления
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      'DELETE FROM notifications WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Уведомление не найдено'
      });
    }

    res.json({
      message: 'Уведомление удалено'
    });

  } catch (error) {
    console.error('Ошибка удаления уведомления:', error);
    res.status(500).json({
      error: 'Внутренняя ошибка сервера'
    });
  }
});

// Получение количества непрочитанных уведомлений
router.get('/unread-count', async (req, res) => {
  try {
    const result = await query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND read = false',
      [req.user.id]
    );

    res.json({
      unread_count: parseInt(result.rows[0].count)
    });

  } catch (error) {
    console.error('Ошибка получения количества непрочитанных уведомлений:', error);
    res.status(500).json({
      error: 'Внутренняя ошибка сервера'
    });
  }
});

export default router;
