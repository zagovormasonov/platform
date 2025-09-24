import express from 'express';
import { query } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Создание заявки эксперту
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { expert_id, client_id, request_reason, message, status = 'pending' } = req.body;

    if (!expert_id || !client_id) {
      return res.status(400).json({
        error: 'Необходимо указать expert_id и client_id'
      });
    }

    const result = await query(
      `INSERT INTO expert_requests (id, expert_id, client_id, request_reason, message, status, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING *`,
      [expert_id, client_id, request_reason, message, status]
    );

    res.status(201).json({
      message: 'Заявка успешно создана',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Ошибка создания заявки:', error);
    res.status(500).json({
      error: 'Внутренняя ошибка сервера'
    });
  }
});

// Получение заявок для эксперта
router.get('/expert/:expertId', authenticateToken, async (req, res) => {
  try {
    const { expertId } = req.params;

    const result = await query(
      `SELECT er.*, p.full_name as client_name, p.email as client_email
       FROM expert_requests er
       JOIN profiles p ON er.client_id = p.id
       WHERE er.expert_id = $1
       ORDER BY er.created_at DESC`,
      [expertId]
    );

    res.json({
      data: result.rows
    });

  } catch (error) {
    console.error('Ошибка получения заявок:', error);
    res.status(500).json({
      error: 'Внутренняя ошибка сервера'
    });
  }
});

// Получение заявок клиента
router.get('/client/:clientId', authenticateToken, async (req, res) => {
  try {
    const { clientId } = req.params;

    const result = await query(
      `SELECT er.*, p.full_name as expert_name, p.email as expert_email
       FROM expert_requests er
       JOIN profiles p ON er.expert_id = p.id
       WHERE er.client_id = $1
       ORDER BY er.created_at DESC`,
      [clientId]
    );

    res.json({
      data: result.rows
    });

  } catch (error) {
    console.error('Ошибка получения заявок:', error);
    res.status(500).json({
      error: 'Внутренняя ошибка сервера'
    });
  }
});

// Обновление статуса заявки
router.patch('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, message } = req.body;

    const result = await query(
      `UPDATE expert_requests 
       SET status = $1, message = $2, updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [status, message, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Заявка не найдена'
      });
    }

    res.json({
      message: 'Статус заявки обновлен',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Ошибка обновления заявки:', error);
    res.status(500).json({
      error: 'Внутренняя ошибка сервера'
    });
  }
});

export default router;
