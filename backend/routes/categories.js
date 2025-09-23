import express from 'express';
import { query } from '../config/database.js';

const router = express.Router();

// Получение списка категорий
router.get('/', async (req, res) => {
  try {
    const sql = `
      SELECT 
        id,
        name,
        description,
        created_at
      FROM categories
      ORDER BY name
    `;

    const result = await query(sql);
    
    res.json({ data: result.rows });
  } catch (error) {
    console.error('Ошибка получения категорий:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Получение категории по ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const sql = `
      SELECT 
        id,
        name,
        description,
        created_at
      FROM categories
      WHERE id = $1
    `;

    const result = await query(sql, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Категория не найдена' });
    }

    res.json({ data: result.rows[0] });
  } catch (error) {
    console.error('Ошибка получения категории:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

export default router;
