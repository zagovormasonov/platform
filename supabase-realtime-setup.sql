-- 0. Проверяем существование таблиц
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('chats', 'messages')
ORDER BY table_name;
SELECT 
    schemaname,
    tablename,
    rowsecurity,
    hasrules
FROM pg_tables 
WHERE tablename = 'messages';

-- 1.1. Альтернативная проверка RLS для таблицы messages
SELECT 
    c.relname as table_name,
    c.relrowsecurity as rls_enabled,
    c.relforcerowsecurity as rls_forced
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relname = 'messages' AND n.nspname = 'public';

-- 2. Проверяем RLS политики для messages
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'messages';

-- 3. Включаем Realtime для таблицы messages (если не включен)
-- Проверяем сначала, включена ли таблица в публикацию
SELECT 
    schemaname,
    tablename
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND tablename = 'messages';

-- Если таблица не найдена в публикации, добавляем её
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE messages;
        RAISE NOTICE 'Таблица messages добавлена в Realtime публикацию';
    ELSE
        RAISE NOTICE 'Таблица messages уже включена в Realtime публикацию';
    END IF;
END $$;

-- 4. Проверяем публикации Realtime
SELECT 
    pubname,
    puballtables,
    pubinsert,
    pubupdate,
    pubdelete
FROM pg_publication 
WHERE pubname = 'supabase_realtime';

-- 5. Проверяем какие таблицы включены в Realtime
SELECT 
    schemaname,
    tablename
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;

-- 6. Создаем функцию для обновления last_message_id в чатах (если не существует)
CREATE OR REPLACE FUNCTION update_chat_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chats 
  SET 
    last_message_id = NEW.id,
    updated_at = NOW()
  WHERE id = NEW.chat_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Создаем триггер для автоматического обновления чата при новом сообщении
DROP TRIGGER IF EXISTS trigger_update_chat_last_message ON messages;
CREATE TRIGGER trigger_update_chat_last_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_chat_last_message();

-- 8. Проверяем что триггер создан
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_update_chat_last_message';

-- 9. Финальная проверка настроек Realtime
SELECT 
    'Realtime настройки завершены' as status,
    COUNT(*) as tables_in_realtime
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND tablename IN ('chats', 'messages');
