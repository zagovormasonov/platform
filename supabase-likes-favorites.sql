-- Создание таблиц для системы лайков и избранного

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

-- Создаем индексы для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_article_likes_user_id ON public.article_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_article_likes_article_id ON public.article_likes(article_id);
CREATE INDEX IF NOT EXISTS idx_article_favorites_user_id ON public.article_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_article_favorites_article_id ON public.article_favorites(article_id);

-- RLS политики для таблицы лайков
ALTER TABLE public.article_likes ENABLE ROW LEVEL SECURITY;

-- Пользователи могут просматривать все лайки
CREATE POLICY "Пользователи могут просматривать лайки" 
ON public.article_likes FOR SELECT 
USING (true);

-- Пользователи могут добавлять свои лайки
CREATE POLICY "Пользователи могут добавлять свои лайки" 
ON public.article_likes FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Пользователи могут удалять свои лайки
CREATE POLICY "Пользователи могут удалять свои лайки" 
ON public.article_likes FOR DELETE 
USING (auth.uid() = user_id);

-- RLS политики для таблицы избранного
ALTER TABLE public.article_favorites ENABLE ROW LEVEL SECURITY;

-- Пользователи могут просматривать только свое избранное
CREATE POLICY "Пользователи могут просматривать свое избранное" 
ON public.article_favorites FOR SELECT 
USING (auth.uid() = user_id);

-- Пользователи могут добавлять в свое избранное
CREATE POLICY "Пользователи могут добавлять в избранное" 
ON public.article_favorites FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Пользователи могут удалять из своего избранного
CREATE POLICY "Пользователи могут удалять из избранного" 
ON public.article_favorites FOR DELETE 
USING (auth.uid() = user_id);

-- Функция для обновления счетчика лайков
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

-- Триггеры для автоматического обновления счетчика лайков
DROP TRIGGER IF EXISTS trigger_update_likes_count_on_insert ON public.article_likes;
CREATE TRIGGER trigger_update_likes_count_on_insert
  AFTER INSERT ON public.article_likes
  FOR EACH ROW EXECUTE FUNCTION public.update_article_likes_count();

DROP TRIGGER IF EXISTS trigger_update_likes_count_on_delete ON public.article_likes;
CREATE TRIGGER trigger_update_likes_count_on_delete
  AFTER DELETE ON public.article_likes
  FOR EACH ROW EXECUTE FUNCTION public.update_article_likes_count();

-- Функция для получения статистики лайков статьи (с указанием пользователя)
CREATE OR REPLACE FUNCTION public.get_article_like_status(article_id_input UUID, user_id_input UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'likes_count', COALESCE(a.likes_count, 0),
    'is_liked', CASE WHEN al.id IS NOT NULL THEN true ELSE false END,
    'is_favorited', CASE WHEN af.id IS NOT NULL THEN true ELSE false END
  ) INTO result
  FROM public.articles a
  LEFT JOIN public.article_likes al ON a.id = al.article_id AND al.user_id = user_id_input
  LEFT JOIN public.article_favorites af ON a.id = af.article_id AND af.user_id = user_id_input
  WHERE a.id = article_id_input;
  
  RETURN COALESCE(result, '{"likes_count": 0, "is_liked": false, "is_favorited": false}'::JSON);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Функция для получения статистики лайков статьи (для текущего пользователя)
CREATE OR REPLACE FUNCTION public.get_article_like_status_current(article_id_input UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    -- Если пользователь не авторизован, возвращаем только количество лайков
    SELECT json_build_object(
      'likes_count', COALESCE(a.likes_count, 0),
      'is_liked', false,
      'is_favorited', false
    ) INTO result
    FROM public.articles a
    WHERE a.id = article_id_input;
  ELSE
    -- Если пользователь авторизован, возвращаем полную информацию
    SELECT json_build_object(
      'likes_count', COALESCE(a.likes_count, 0),
      'is_liked', CASE WHEN al.id IS NOT NULL THEN true ELSE false END,
      'is_favorited', CASE WHEN af.id IS NOT NULL THEN true ELSE false END
    ) INTO result
    FROM public.articles a
    LEFT JOIN public.article_likes al ON a.id = al.article_id AND al.user_id = current_user_id
    LEFT JOIN public.article_favorites af ON a.id = af.article_id AND af.user_id = current_user_id
    WHERE a.id = article_id_input;
  END IF;
  
  RETURN COALESCE(result, '{"likes_count": 0, "is_liked": false, "is_favorited": false}'::JSON);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Даем права на выполнение функций
GRANT EXECUTE ON FUNCTION public.update_article_likes_count() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_article_like_status(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_article_like_status_current(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_article_like_status_current(UUID) TO anon;
