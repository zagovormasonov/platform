-- Исправление статуса эксперта для существующей структуры БД (только is_expert)
-- Выполните этот скрипт в Adminer для проверки и исправления статуса экспертов

-- 1. Проверяем текущий статус всех пользователей
SELECT 
    id, 
    email, 
    full_name, 
    is_expert,
    CASE 
        WHEN is_expert = true THEN '✅ Эксперт'
        WHEN is_expert = false THEN '👤 Пользователь'
        ELSE '❓ Неопределен'
    END as status
FROM profiles 
ORDER BY is_expert DESC, full_name;

-- 2. Если нужно добавить поле user_type (опционально)
-- Раскомментируйте следующие строки, если хотите добавить поле user_type:
/*
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS user_type VARCHAR(50) DEFAULT 'user' 
CHECK (user_type IN ('user', 'expert', 'admin'));

-- Обновляем user_type на основе is_expert
UPDATE profiles 
SET user_type = CASE 
    WHEN is_expert = true THEN 'expert'
    ELSE 'user'
END;
*/
