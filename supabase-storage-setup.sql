-- Настройка Supabase Storage для аватаров
-- Выполните эти команды в SQL Editor вашего проекта Supabase

-- Создание bucket для аватаров
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true);

-- Политики для bucket avatars
CREATE POLICY "Anyone can view avatars" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Authenticated users can upload avatars" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = 'avatars'
);

CREATE POLICY "Users can update their own avatars" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'avatars' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = 'avatars'
  AND auth.uid()::text = (storage.filename(name))
);

CREATE POLICY "Users can delete their own avatars" ON storage.objects
FOR DELETE USING (
  bucket_id = 'avatars' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = 'avatars'
  AND auth.uid()::text = (storage.filename(name))
);

-- Ограничения на размер файла (5MB)
ALTER TABLE storage.objects 
ADD CONSTRAINT avatars_size_limit 
CHECK (
  bucket_id != 'avatars' OR 
  (bucket_id = 'avatars' AND octet_length(decode(encode, 'base64')) <= 5242880)
);

-- Ограничения на тип файла (только изображения)
ALTER TABLE storage.objects 
ADD CONSTRAINT avatars_type_limit 
CHECK (
  bucket_id != 'avatars' OR 
  (bucket_id = 'avatars' AND metadata->>'mimetype' LIKE 'image/%')
);
