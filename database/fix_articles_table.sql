-- Добавление недостающих полей в таблицу articles
-- Выполните этот скрипт в Adminer для исправления структуры таблицы

-- Добавляем поле image_url в таблицу articles
ALTER TABLE articles 
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Проверяем структуру таблицы
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'articles' 
ORDER BY ordinal_position;
