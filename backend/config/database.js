import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

// Отладочная информация
console.log('Database config:', {
  user: process.env.POSTGRES_USER || 'platform_user',
  host: process.env.POSTGRES_HOST || 'localhost',
  database: process.env.POSTGRES_DB || 'platform_db',
  password: process.env.POSTGRES_PASSWORD ? '***' : 'NOT SET',
  port: process.env.POSTGRES_PORT || 5432,
  nodeEnv: process.env.NODE_ENV
});

// Создание пула соединений с PostgreSQL
const pool = new Pool({
  user: process.env.POSTGRES_USER || 'platform_user',
  host: process.env.POSTGRES_HOST || 'localhost',
  database: process.env.POSTGRES_DB || 'platform_db',
  password: process.env.POSTGRES_PASSWORD,
  port: process.env.POSTGRES_PORT || 5432,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20, // максимум соединений в пуле
  idleTimeoutMillis: 30000, // время ожидания перед закрытием неактивного соединения
  connectionTimeoutMillis: 2000, // время ожидания для получения соединения
});

// Обработка ошибок пула
pool.on('error', (err) => {
  console.error('Ошибка пула соединений PostgreSQL:', err);
});

// Функция для выполнения запросов
export const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Выполнен запрос', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Ошибка выполнения запроса:', error);
    throw error;
  }
};

// Функция для получения клиента из пула
export const getClient = async () => {
  return await pool.connect();
};

// Функция для транзакций
export const transaction = async (callback) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export default pool;
