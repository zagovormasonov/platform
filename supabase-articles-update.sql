-- Обновление таблицы articles для новой функциональности
-- Добавляем поля для изображения, тегов и просмотров

-- Добавляем поле для изображения статьи
ALTER TABLE articles 
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS views_count INTEGER DEFAULT 0;

-- Создаем индекс для тегов
CREATE INDEX IF NOT EXISTS idx_articles_tags ON articles USING GIN (tags);

-- Создаем индекс для сортировки по просмотрам
CREATE INDEX IF NOT EXISTS idx_articles_views ON articles (views_count DESC);

-- Создаем индекс для комбинированной сортировки
CREATE INDEX IF NOT EXISTS idx_articles_created_views ON articles (created_at DESC, views_count DESC);

-- Функция для увеличения счетчика просмотров
CREATE OR REPLACE FUNCTION increment_article_views(article_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE articles 
  SET views_count = COALESCE(views_count, 0) + 1,
      updated_at = NOW()
  WHERE id = article_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Права на выполнение функции
GRANT EXECUTE ON FUNCTION increment_article_views(UUID) TO authenticated;

COMMENT ON TABLE articles IS 'Статьи с изображениями, тегами и счетчиком просмотров';
COMMENT ON COLUMN articles.image_url IS 'URL изображения статьи';
COMMENT ON COLUMN articles.tags IS 'Массив тегов статьи (максимум 5)';
COMMENT ON COLUMN articles.views_count IS 'Количество просмотров статьи';
