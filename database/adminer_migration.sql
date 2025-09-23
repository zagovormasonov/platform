-- Автоматическое создание всех недостающих полей для платформы
-- Скопируйте и выполните этот скрипт в Adminer

-- =============================================
-- ДОБАВЛЕНИЕ ПОЛЕЙ В ТАБЛИЦУ PROFILES
-- =============================================

-- Добавляем поле rating (рейтинг эксперта)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='profiles' AND column_name='rating') THEN
        ALTER TABLE profiles ADD COLUMN rating NUMERIC(2,1) DEFAULT 0.0;
        ALTER TABLE profiles ALTER COLUMN rating SET NOT NULL;
    END IF;
END $$;

-- Добавляем поле total_requests (общее количество запросов)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='profiles' AND column_name='total_requests') THEN
        ALTER TABLE profiles ADD COLUMN total_requests INTEGER DEFAULT 0;
        ALTER TABLE profiles ALTER COLUMN total_requests SET NOT NULL;
    END IF;
END $$;

-- =============================================
-- ДОБАВЛЕНИЕ ПОЛЕЙ В ТАБЛИЦУ EXPERT_SERVICES
-- =============================================

-- Добавляем поле is_available (доступность услуги)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='expert_services' AND column_name='is_available') THEN
        ALTER TABLE expert_services ADD COLUMN is_available BOOLEAN DEFAULT TRUE;
        ALTER TABLE expert_services ALTER COLUMN is_available SET NOT NULL;
    END IF;
END $$;

-- =============================================
-- ДОБАВЛЕНИЕ ПОЛЕЙ В ТАБЛИЦУ EXPERT_SCHEDULE
-- =============================================

-- Добавляем поле duration_minutes (длительность занятия в минутах)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='expert_schedule' AND column_name='duration_minutes') THEN
        ALTER TABLE expert_schedule ADD COLUMN duration_minutes INTEGER DEFAULT 60;
        ALTER TABLE expert_schedule ALTER COLUMN duration_minutes SET NOT NULL;
    END IF;
END $$;

-- =============================================
-- ДОБАВЛЕНИЕ ПОЛЕЙ В ТАБЛИЦУ TIME_SLOTS
-- =============================================

-- Добавляем поле duration_minutes (длительность слота в минутах)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='time_slots' AND column_name='duration_minutes') THEN
        ALTER TABLE time_slots ADD COLUMN duration_minutes INTEGER DEFAULT 60;
        ALTER TABLE time_slots ALTER COLUMN duration_minutes SET NOT NULL;
    END IF;
END $$;

-- =============================================
-- СОЗДАНИЕ ИНДЕКСОВ ДЛЯ ПРОИЗВОДИТЕЛЬНОСТИ
-- =============================================

-- Индексы для таблицы profiles
CREATE INDEX IF NOT EXISTS idx_profiles_is_expert ON profiles(is_expert);
CREATE INDEX IF NOT EXISTS idx_profiles_rating ON profiles(rating);
CREATE INDEX IF NOT EXISTS idx_profiles_total_requests ON profiles(total_requests);

-- Индексы для таблицы expert_categories
CREATE INDEX IF NOT EXISTS idx_expert_categories_expert_id ON expert_categories(expert_id);
CREATE INDEX IF NOT EXISTS idx_expert_categories_category_id ON expert_categories(category_id);

-- Индексы для таблицы expert_services
CREATE INDEX IF NOT EXISTS idx_expert_services_expert_id ON expert_services(expert_id);
CREATE INDEX IF NOT EXISTS idx_expert_services_is_available ON expert_services(is_available);

-- Индексы для таблицы expert_schedule
CREATE INDEX IF NOT EXISTS idx_expert_schedule_expert_id ON expert_schedule(expert_id);

-- Индексы для таблицы time_slots
CREATE INDEX IF NOT EXISTS idx_time_slots_expert_id ON time_slots(expert_id);
CREATE INDEX IF NOT EXISTS idx_time_slots_slot_date ON time_slots(slot_date);
CREATE INDEX IF NOT EXISTS idx_time_slots_is_available ON time_slots(is_available);

-- =============================================
-- ОБНОВЛЕНИЕ СУЩЕСТВУЮЩИХ ДАННЫХ
-- =============================================

-- Обновляем рейтинги для существующих экспертов
UPDATE profiles 
SET rating = CASE 
    WHEN is_expert = true THEN 4.5 
    ELSE 0.0 
END 
WHERE rating = 0.0;

-- Обновляем количество запросов для экспертов
UPDATE profiles 
SET total_requests = CASE 
    WHEN is_expert = true THEN 10 
    ELSE 0 
END 
WHERE total_requests = 0;

-- Обновляем доступность всех услуг
UPDATE expert_services 
SET is_available = TRUE 
WHERE is_available IS NULL;

-- Обновляем длительность для существующих расписаний
UPDATE expert_schedule 
SET duration_minutes = 60 
WHERE duration_minutes IS NULL;

-- Обновляем длительность для существующих слотов
UPDATE time_slots 
SET duration_minutes = 60 
WHERE duration_minutes IS NULL;

-- =============================================
-- ПРОВЕРКА РЕЗУЛЬТАТА
-- =============================================

-- Показываем структуру обновленных таблиц
SELECT 'profiles' as table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
ORDER BY ordinal_position;

SELECT 'expert_services' as table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'expert_services' 
ORDER BY ordinal_position;

SELECT 'expert_schedule' as table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'expert_schedule' 
ORDER BY ordinal_position;

SELECT 'time_slots' as table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'time_slots' 
ORDER BY ordinal_position;

-- Показываем количество записей в каждой таблице
SELECT 'profiles' as table_name, COUNT(*) as record_count FROM profiles
UNION ALL
SELECT 'expert_services' as table_name, COUNT(*) as record_count FROM expert_services
UNION ALL
SELECT 'expert_schedule' as table_name, COUNT(*) as record_count FROM expert_schedule
UNION ALL
SELECT 'time_slots' as table_name, COUNT(*) as record_count FROM time_slots;

-- =============================================
-- СООБЩЕНИЕ О ЗАВЕРШЕНИИ
-- =============================================

SELECT 'Миграция успешно завершена! Все необходимые поля добавлены.' as status;
