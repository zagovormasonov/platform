-- Миграция для добавления недостающих полей

-- Добавление полей rating и total_requests в таблицу profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS rating NUMERIC(2, 1) DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS total_requests INTEGER DEFAULT 0;

-- Добавление поля is_available в таблицу expert_services
ALTER TABLE expert_services 
ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT TRUE;

-- Переименование поля title в service_name в таблице expert_services (если нужно)
-- ALTER TABLE expert_services RENAME COLUMN title TO service_name;

-- Добавление поля duration_minutes в таблицу expert_schedule
ALTER TABLE expert_schedule 
ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 60;

-- Добавление поля duration_minutes в таблицу time_slots
ALTER TABLE time_slots 
ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 60;

-- Создание индексов для лучшей производительности
CREATE INDEX IF NOT EXISTS idx_profiles_rating ON profiles(rating);
CREATE INDEX IF NOT EXISTS idx_profiles_total_requests ON profiles(total_requests);
CREATE INDEX IF NOT EXISTS idx_expert_services_is_available ON expert_services(is_available);

-- Обновление существующих записей
UPDATE profiles SET rating = 4.5 WHERE is_expert = true AND rating = 0;
UPDATE profiles SET total_requests = 10 WHERE is_expert = true AND total_requests = 0;
UPDATE expert_services SET is_available = true WHERE is_available IS NULL;
