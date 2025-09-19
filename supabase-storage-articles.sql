-- Создание bucket для изображений статей
-- Этот скрипт нужно выполнить в Supabase Dashboard -> SQL Editor

-- Создаем bucket для изображений статей
INSERT INTO storage.buckets (id, name, public)
VALUES ('articles', 'articles', true)
ON CONFLICT (id) DO NOTHING;

-- Политика для загрузки файлов (только аутентифицированные пользователи могут загружать)
CREATE POLICY "Users can upload article images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'articles' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Политика для просмотра файлов (все могут просматривать)
CREATE POLICY "Anyone can view article images"
ON storage.objects FOR SELECT
USING (bucket_id = 'articles');

-- Политика для обновления файлов (только владелец может обновлять)
CREATE POLICY "Users can update their own article images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'articles' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Политика для удаления файлов (только владелец может удалять)
CREATE POLICY "Users can delete their own article images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'articles' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Обновляем bucket чтобы он был публичным
UPDATE storage.buckets 
SET public = true 
WHERE id = 'articles';

COMMENT ON TABLE storage.buckets IS 'Storage buckets for file uploads';
COMMENT ON POLICY "Users can upload article images" ON storage.objects IS 'Позволяет пользователям загружать изображения в свои папки';
COMMENT ON POLICY "Anyone can view article images" ON storage.objects IS 'Позволяет всем просматривать изображения статей';
COMMENT ON POLICY "Users can update their own article images" ON storage.objects IS 'Позволяет пользователям обновлять только свои изображения';
COMMENT ON POLICY "Users can delete their own article images" ON storage.objects IS 'Позволяет пользователям удалять только свои изображения';
