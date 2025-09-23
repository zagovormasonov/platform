import express from 'express';
import { query } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Получение списка экспертов
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, category, city } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE is_expert = true';
    const params = [];
    let paramIndex = 1;

    if (category) {
      whereClause += ` AND expert_categories.category_id = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    if (city) {
      whereClause += ` AND profiles.city ILIKE $${paramIndex}`;
      params.push(`%${city}%`);
      paramIndex++;
    }

    const sql = `
      SELECT DISTINCT 
        profiles.id,
        profiles.email,
        profiles.full_name,
        profiles.avatar_url,
        profiles.bio,
        profiles.website_url,
        profiles.github_url,
        profiles.linkedin_url,
        profiles.twitter_url,
        profiles.instagram_url,
        profiles.telegram_url,
        profiles.city,
        profiles.is_expert,
        profiles.expert_bio,
        profiles.expert_specialization,
        profiles.rating,
        profiles.total_requests,
        profiles.created_at,
        profiles.updated_at
      FROM profiles
      LEFT JOIN expert_categories ON profiles.id = expert_categories.expert_id
      ${whereClause}
      ORDER BY profiles.rating DESC, profiles.total_requests DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(limit, offset);

    const result = await query(sql, params);
    
    res.json({
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: result.rows.length
      }
    });
  } catch (error) {
    console.error('Ошибка получения экспертов:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Получение профиля эксперта
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const sql = `
      SELECT 
        profiles.*,
        ARRAY_AGG(DISTINCT categories.name) as categories
      FROM profiles
      LEFT JOIN expert_categories ON profiles.id = expert_categories.expert_id
      LEFT JOIN categories ON expert_categories.category_id = categories.id
      WHERE profiles.id = $1 AND profiles.is_expert = true
      GROUP BY profiles.id
    `;

    const result = await query(sql, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Эксперт не найден' });
    }

    res.json({ data: result.rows[0] });
  } catch (error) {
    console.error('Ошибка получения профиля эксперта:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Получение услуг эксперта
router.get('/:id/services', async (req, res) => {
  try {
    const { id } = req.params;

    const sql = `
      SELECT 
        id,
        expert_id,
        title as service_name,
        description,
        price,
        duration_minutes,
        is_available,
        created_at
      FROM expert_services
      WHERE expert_id = $1 AND is_available = true
      ORDER BY title
    `;

    const result = await query(sql, [id]);
    
    res.json({ data: result.rows });
  } catch (error) {
    console.error('Ошибка получения услуг эксперта:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Получение расписания эксперта
router.get('/:id/schedule', async (req, res) => {
  try {
    const { id } = req.params;
    const { start_date, end_date } = req.query;

    let whereClause = 'WHERE expert_id = $1';
    const params = [id];

    if (start_date) {
      whereClause += ' AND slot_date >= $2';
      params.push(start_date);
    }

    if (end_date) {
      whereClause += ` AND slot_date <= $${params.length + 1}`;
      params.push(end_date);
    }

    const sql = `
      SELECT 
        id,
        expert_id,
        slot_date,
        start_time,
        end_time,
        is_available,
        duration_minutes,
        created_at
      FROM time_slots
      ${whereClause}
      ORDER BY slot_date, start_time
    `;

    const result = await query(sql, params);
    
    res.json({ data: result.rows });
  } catch (error) {
    console.error('Ошибка получения расписания эксперта:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

export default router;
