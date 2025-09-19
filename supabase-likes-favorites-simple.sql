-- Упрощенный скрипт создания системы лайков и избранного
-- Выполняйте по частям если возникают ошибки

-- ========================================
-- ЧАСТЬ 1: Создание таблиц
-- ========================================

-- Таблица лайков
CREATE TABLE IF NOT EXISTS public.article_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  article_id UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Уникальный индекс для предотвращения дублирования лайков
  UNIQUE(user_id, article_id)
);

-- Таблица избранного
CREATE TABLE IF NOT EXISTS public.article_favorites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  article_id UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Уникальный индекс для предотвращения дублирования избранного
  UNIQUE(user_id, article_id)
);

-- Добавляем поле likes_count в таблицу articles
ALTER TABLE public.articles 
ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0;

-- ========================================
-- ЧАСТЬ 2: Создание индексов
-- ========================================

CREATE INDEX IF NOT EXISTS idx_article_likes_user_id ON public.article_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_article_likes_article_id ON public.article_likes(article_id);
CREATE INDEX IF NOT EXISTS idx_article_favorites_user_id ON public.article_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_article_favorites_article_id ON public.article_favorites(article_id);

-- ========================================
-- ЧАСТЬ 3: RLS политики для лайков
-- ========================================

ALTER TABLE public.article_likes ENABLE ROW LEVEL SECURITY;

-- Удаляем существующие политики если есть
DROP POLICY IF EXISTS "Пользователи могут просматривать лайки" ON public.article_likes;
DROP POLICY IF EXISTS "Пользователи могут добавлять свои лайки" ON public.article_likes;
DROP POLICY IF EXISTS "Пользователи могут удалять свои лайки" ON public.article_likes;

-- Создаем новые политики
CREATE POLICY "Пользователи могут просматривать лайки" 
ON public.article_likes FOR SELECT 
USING (true);

CREATE POLICY "Пользователи могут добавлять свои лайки" 
ON public.article_likes FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Пользователи могут удалять свои лайки" 
ON public.article_likes FOR DELETE 
USING (auth.uid() = user_id);

-- ========================================
-- ЧАСТЬ 4: RLS политики для избранного
-- ========================================

ALTER TABLE public.article_favorites ENABLE ROW LEVEL SECURITY;

-- Удаляем существующие политики если есть
DROP POLICY IF EXISTS "Пользователи могут просматривать свое избранное" ON public.article_favorites;
DROP POLICY IF EXISTS "Пользователи могут добавлять в избранное" ON public.article_favorites;
DROP POLICY IF EXISTS "Пользователи могут удалять из избранного" ON public.article_favorites;

-- Создаем новые политики
CREATE POLICY "Пользователи могут просматривать свое избранное" 
ON public.article_favorites FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Пользователи могут добавлять в избранное" 
ON public.article_favorites FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Пользователи могут удалять из избранного" 
ON public.article_favorites FOR DELETE 
USING (auth.uid() = user_id);

-- ========================================
-- ЧАСТЬ 5: Функция обновления счетчика лайков
-- ========================================

-- Удаляем старую функцию если есть
DROP FUNCTION IF EXISTS public.update_article_likes_count();

-- Создаем функцию обновления счетчика лайков
CREATE OR REPLACE FUNCTION public.update_article_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.articles 
    SET likes_count = COALESCE(likes_count, 0) + 1 
    WHERE id = NEW.article_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.articles 
    SET likes_count = GREATEST(COALESCE(likes_count, 0) - 1, 0) 
    WHERE id = OLD.article_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- ЧАСТЬ 6: Триггеры
-- ========================================

-- Удаляем старые триггеры если есть
DROP TRIGGER IF EXISTS trigger_update_likes_count_on_insert ON public.article_likes;
DROP TRIGGER IF EXISTS trigger_update_likes_count_on_delete ON public.article_likes;

-- Создаем триггеры
CREATE TRIGGER trigger_update_likes_count_on_insert
  AFTER INSERT ON public.article_likes
  FOR EACH ROW EXECUTE FUNCTION public.update_article_likes_count();

CREATE TRIGGER trigger_update_likes_count_on_delete
  AFTER DELETE ON public.article_likes
  FOR EACH ROW EXECUTE FUNCTION public.update_article_likes_count();

-- ========================================
-- ЧАСТЬ 7: Права доступа
-- ========================================

GRANT EXECUTE ON FUNCTION public.update_article_likes_count() TO authenticated;
