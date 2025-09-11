-- SQL скрипты для обновления существующей базы данных Supabase
-- Выполните эти команды в SQL Editor вашего проекта Supabase

-- Добавление новых полей в существующую таблицу profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS website_url TEXT,
ADD COLUMN IF NOT EXISTS github_url TEXT,
ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
ADD COLUMN IF NOT EXISTS twitter_url TEXT,
ADD COLUMN IF NOT EXISTS instagram_url TEXT,
ADD COLUMN IF NOT EXISTS telegram_url TEXT;

-- Создание таблицы друзей (если не существует)
CREATE TABLE IF NOT EXISTS friendships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  friend_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, accepted, blocked
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, friend_id)
);

-- Включение RLS (Row Level Security) для таблицы друзей
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

-- Политики для друзей (создаем только если не существуют)
DO $$ 
BEGIN
    -- Проверяем и создаем политики для друзей
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'friendships' AND policyname = 'Users can view their own friendships') THEN
        CREATE POLICY "Users can view their own friendships" ON friendships
          FOR SELECT USING (auth.uid() = user_id OR auth.uid() = friend_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'friendships' AND policyname = 'Users can create friendship requests') THEN
        CREATE POLICY "Users can create friendship requests" ON friendships
          FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'friendships' AND policyname = 'Users can update their own friendships') THEN
        CREATE POLICY "Users can update their own friendships" ON friendships
          FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = friend_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'friendships' AND policyname = 'Users can delete their own friendships') THEN
        CREATE POLICY "Users can delete their own friendships" ON friendships
          FOR DELETE USING (auth.uid() = user_id OR auth.uid() = friend_id);
    END IF;
END $$;

-- Обновление политики для просмотра профилей (если не существует)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can view profiles of article authors') THEN
        CREATE POLICY "Users can view profiles of article authors" ON profiles
          FOR SELECT USING (true);
    END IF;
END $$;

-- Обновление функции для автоматического создания профиля
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, bio, website_url, github_url, linkedin_url, twitter_url, instagram_url, telegram_url)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name', NULL, NULL, NULL, NULL, NULL, NULL, NULL);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Пересоздание триггера (удаляем старый и создаем новый)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
