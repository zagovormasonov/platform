-- Обновление схемы базы данных для поддержки экспертов и категорий
-- Выполните эти команды в SQL Editor вашего проекта Supabase

-- Добавление новых полей в таблицу profiles
-- Проверяем и добавляем поля по одному, чтобы избежать ошибок если они уже существуют

-- Добавляем user_type
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'user_type') THEN
        ALTER TABLE profiles ADD COLUMN user_type TEXT DEFAULT 'user' CHECK (user_type IN ('user', 'expert'));
    END IF;
END $$;

-- Добавляем phone
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'phone') THEN
        ALTER TABLE profiles ADD COLUMN phone TEXT;
    END IF;
END $$;

-- Добавляем city
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'city') THEN
        ALTER TABLE profiles ADD COLUMN city TEXT;
    END IF;
END $$;

-- Добавляем description
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'description') THEN
        ALTER TABLE profiles ADD COLUMN description TEXT;
    END IF;
END $$;

-- Добавляем accepts_online
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'accepts_online') THEN
        ALTER TABLE profiles ADD COLUMN accepts_online BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Добавляем accepts_offline
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'accepts_offline') THEN
        ALTER TABLE profiles ADD COLUMN accepts_offline BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Добавляем rating
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'rating') THEN
        ALTER TABLE profiles ADD COLUMN rating DECIMAL(3,2) DEFAULT 0.00;
    END IF;
END $$;

-- Добавляем total_reviews
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'total_reviews') THEN
        ALTER TABLE profiles ADD COLUMN total_reviews INTEGER DEFAULT 0;
    END IF;
END $$;

-- Добавляем total_requests
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'total_requests') THEN
        ALTER TABLE profiles ADD COLUMN total_requests INTEGER DEFAULT 0;
    END IF;
END $$;

-- Создание таблицы категорий
CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Вставка категорий (только если их еще нет)
INSERT INTO categories (name, description) VALUES
('Регресс', 'Работа с прошлыми жизнями и травмами'),
('Парапсихология', 'Изучение паранормальных явлений'),
('Расстановки', 'Системные семейные расстановки'),
('Хьюман дизайн', 'Система самопознания и развития'),
('МАК карты', 'Метафорические ассоциативные карты'),
('Таро', 'Карты Таро для предсказаний и самопознания'),
('Руны', 'Древние символы для гадания и магии'),
('Карты Ленорман', 'Система гадания на картах Ленорман'),
('Астрология', 'Изучение влияния звезд и планет'),
('Нумерология', 'Наука о числах и их влиянии'),
('Тетахилинг', 'Техника медитации для исцеления'),
('Космоэнергетика', 'Работа с космическими энергиями'),
('Рейки', 'Японская техника исцеления'),
('Шаманизм', 'Древние духовные практики'),
('Славянские практики', 'Традиционные славянские обряды'),
('Звукотерапия', 'Исцеление звуком и музыкой'),
('Целительство', 'Различные методы исцеления'),
('Женские практики', 'Практики для женского развития'),
('Йога', 'Древняя система физических и духовных практик'),
('Гвоздестояние', 'Практика стояния на гвоздях'),
('Тантра практики', 'Духовные и сексуальные практики'),
('Нутрициология', 'Наука о питании и здоровье'),
('Ароматерапия', 'Исцеление ароматами'),
('Квантовая психология', 'Психология на основе квантовой физики'),
('Медитация', 'Практики осознанности и концентрации'),
('Нейрографика', 'Метод трансформации через рисование'),
('Мандалы', 'Сакральные геометрические символы'),
('Литотерапия', 'Исцеление камнями и минералами'),
('Кинезиология', 'Наука о движении и мышечном тестировании')
ON CONFLICT (name) DO NOTHING;

-- Создание таблицы связей экспертов с категориями
CREATE TABLE IF NOT EXISTS expert_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  expert_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(expert_id, category_id)
);

-- Создание таблицы отзывов
CREATE TABLE IF NOT EXISTS reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  expert_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  client_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  request_reason TEXT CHECK (request_reason IN ('здоровье', 'психическое', 'физическое', 'раскрытие способностей', 'наставничество', 'предсказания', 'самопознание')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создание таблицы заявок к экспертам
CREATE TABLE IF NOT EXISTS expert_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  expert_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  client_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  request_reason TEXT CHECK (request_reason IN ('здоровье', 'психическое', 'физическое', 'раскрытие способностей', 'наставничество', 'предсказания', 'самопознание')),
  message TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Включение RLS для новых таблиц
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expert_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE expert_requests ENABLE ROW LEVEL SECURITY;

-- Политики для категорий
DROP POLICY IF EXISTS "Anyone can view categories" ON categories;
CREATE POLICY "Anyone can view categories" ON categories
  FOR SELECT USING (true);

-- Политики для связей экспертов с категориями
DROP POLICY IF EXISTS "Anyone can view expert categories" ON expert_categories;
CREATE POLICY "Anyone can view expert categories" ON expert_categories
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Experts can manage their own categories" ON expert_categories;
CREATE POLICY "Experts can manage their own categories" ON expert_categories
  FOR ALL USING (auth.uid() = expert_id);

-- Политики для отзывов
DROP POLICY IF EXISTS "Anyone can view reviews" ON reviews;
CREATE POLICY "Anyone can view reviews" ON reviews
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create reviews" ON reviews;
CREATE POLICY "Users can create reviews" ON reviews
  FOR INSERT WITH CHECK (auth.uid() = client_id);

DROP POLICY IF EXISTS "Users can update their own reviews" ON reviews;
CREATE POLICY "Users can update their own reviews" ON reviews
  FOR UPDATE USING (auth.uid() = client_id);

DROP POLICY IF EXISTS "Users can delete their own reviews" ON reviews;
CREATE POLICY "Users can delete their own reviews" ON reviews
  FOR DELETE USING (auth.uid() = client_id);

-- Политики для заявок
DROP POLICY IF EXISTS "Users can view their own requests" ON expert_requests;
CREATE POLICY "Users can view their own requests" ON expert_requests
  FOR SELECT USING (auth.uid() = client_id OR auth.uid() = expert_id);

DROP POLICY IF EXISTS "Users can create requests" ON expert_requests;
CREATE POLICY "Users can create requests" ON expert_requests
  FOR INSERT WITH CHECK (auth.uid() = client_id);

DROP POLICY IF EXISTS "Experts can update requests to them" ON expert_requests;
CREATE POLICY "Experts can update requests to them" ON expert_requests
  FOR UPDATE USING (auth.uid() = expert_id);

-- Обновление политик для профилей
DROP POLICY IF EXISTS "Users can view profiles of article authors" ON profiles;
CREATE POLICY "Anyone can view profiles" ON profiles
  FOR SELECT USING (true);

-- Функция для обновления рейтинга эксперта
CREATE OR REPLACE FUNCTION update_expert_rating()
RETURNS TRIGGER AS $$
BEGIN
  -- Обновляем рейтинг и количество отзывов для эксперта
  UPDATE profiles 
  SET 
    rating = (
      SELECT COALESCE(AVG(rating), 0) 
      FROM reviews 
      WHERE expert_id = COALESCE(NEW.expert_id, OLD.expert_id)
    ),
    total_reviews = (
      SELECT COUNT(*) 
      FROM reviews 
      WHERE expert_id = COALESCE(NEW.expert_id, OLD.expert_id)
    )
  WHERE id = COALESCE(NEW.expert_id, OLD.expert_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Триггеры для обновления рейтинга
DROP TRIGGER IF EXISTS update_expert_rating_on_review_insert ON reviews;
CREATE TRIGGER update_expert_rating_on_review_insert
  AFTER INSERT ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_expert_rating();

DROP TRIGGER IF EXISTS update_expert_rating_on_review_update ON reviews;
CREATE TRIGGER update_expert_rating_on_review_update
  AFTER UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_expert_rating();

DROP TRIGGER IF EXISTS update_expert_rating_on_review_delete ON reviews;
CREATE TRIGGER update_expert_rating_on_review_delete
  AFTER DELETE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_expert_rating();

-- Функция для обновления количества заявок
CREATE OR REPLACE FUNCTION update_expert_requests_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Обновляем количество заявок для эксперта
  UPDATE profiles 
  SET total_requests = (
    SELECT COUNT(*) 
    FROM expert_requests 
    WHERE expert_id = COALESCE(NEW.expert_id, OLD.expert_id)
  )
  WHERE id = COALESCE(NEW.expert_id, OLD.expert_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Триггеры для обновления количества заявок
DROP TRIGGER IF EXISTS update_expert_requests_count_on_request_insert ON expert_requests;
CREATE TRIGGER update_expert_requests_count_on_request_insert
  AFTER INSERT ON expert_requests
  FOR EACH ROW EXECUTE FUNCTION update_expert_requests_count();

DROP TRIGGER IF EXISTS update_expert_requests_count_on_request_delete ON expert_requests;
CREATE TRIGGER update_expert_requests_count_on_request_delete
  AFTER DELETE ON expert_requests
  FOR EACH ROW EXECUTE FUNCTION update_expert_requests_count();

-- Обновление функции создания профиля
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    email, 
    full_name, 
    user_type,
    bio, 
    website_url, 
    github_url, 
    linkedin_url, 
    twitter_url, 
    instagram_url, 
    telegram_url
  )
  VALUES (
    NEW.id, 
    NEW.email, 
    NEW.raw_user_meta_data->>'full_name',
    COALESCE(NEW.raw_user_meta_data->>'user_type', 'user'),
    NULL, 
    NULL, 
    NULL, 
    NULL, 
    NULL, 
    NULL, 
    NULL
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;