-- Быстрое исправление структуры таблицы chats
-- Выполните этот скрипт в SQL Editor Supabase для исправления ошибки

-- 1. Добавляем недостающие колонки в таблицу chats
ALTER TABLE chats ADD COLUMN IF NOT EXISTS last_message_id UUID REFERENCES messages(id);
ALTER TABLE chats ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 2. Проверяем структуру таблицы chats
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'chats' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Создаем функцию для обновления last_message_id в чатах
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

-- 4. Создаем триггер для автоматического обновления чата при новом сообщении
DROP TRIGGER IF EXISTS trigger_update_chat_last_message ON messages;
CREATE TRIGGER trigger_update_chat_last_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_chat_last_message();

-- 5. Проверяем что триггер создан
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_update_chat_last_message';

-- 6. Включаем Realtime для таблицы messages (если не включен)
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

-- 7. Проверяем что таблица включена в Realtime
SELECT 
    schemaname,
    tablename
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND tablename = 'messages';
