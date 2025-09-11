-- Настройка Supabase Storage для аватаров
-- Выполните эти команды в SQL Editor вашего проекта Supabase

-- Создание bucket для аватаров (если еще не существует)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Примечание: Политики безопасности для storage.objects 
-- нужно настроить через веб-интерфейс Supabase:
-- 
-- 1. Перейдите в раздел "Storage" в панели Supabase
-- 2. Найдите bucket "avatars" 
-- 3. Перейдите в "Policies" 
-- 4. Добавьте следующие политики:
--
-- SELECT Policy:
-- Name: "Anyone can view avatars"
-- Policy: bucket_id = 'avatars'
--
-- INSERT Policy: 
-- Name: "Authenticated users can upload avatars"
-- Policy: bucket_id = 'avatars' AND auth.role() = 'authenticated'
--
-- UPDATE Policy:
-- Name: "Users can update their own avatars" 
-- Policy: bucket_id = 'avatars' AND auth.role() = 'authenticated' AND auth.uid()::text = (storage.filename(name))
--
-- DELETE Policy:
-- Name: "Users can delete their own avatars"
-- Policy: bucket_id = 'avatars' AND auth.role() = 'authenticated' AND auth.uid()::text = (storage.filename(name))
