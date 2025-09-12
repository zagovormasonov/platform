-- Добавление полей для онлайн статуса
-- Выполните в SQL Editor Supabase

-- Добавляем поле is_online
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'is_online') THEN
        ALTER TABLE profiles ADD COLUMN is_online BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Добавляем поле last_seen
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'last_seen') THEN
        ALTER TABLE profiles ADD COLUMN last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- Создаем индекс для быстрого поиска онлайн пользователей
CREATE INDEX IF NOT EXISTS idx_profiles_is_online ON profiles(is_online);
CREATE INDEX IF NOT EXISTS idx_profiles_last_seen ON profiles(last_seen);

-- Функция для автоматического обновления last_seen
CREATE OR REPLACE FUNCTION update_last_seen()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_seen = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггер для автоматического обновления last_seen при изменении профиля
DROP TRIGGER IF EXISTS update_profiles_last_seen ON profiles;
CREATE TRIGGER update_profiles_last_seen
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_last_seen();

-- Комментарии к полям
COMMENT ON COLUMN profiles.is_online IS 'Статус онлайн пользователя';
COMMENT ON COLUMN profiles.last_seen IS 'Время последней активности пользователя';
