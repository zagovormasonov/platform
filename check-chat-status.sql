-- Проверка статуса чатов и Realtime
-- Выполните этот скрипт для проверки настроек

-- 1. Проверяем структуру таблицы chats
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'chats' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Проверяем структуру таблицы messages
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'messages' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Проверяем Realtime публикации
SELECT 
    schemaname,
    tablename
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND tablename IN ('chats', 'messages')
ORDER BY tablename;

-- 4. Проверяем триггеры
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_update_chat_last_message';

-- 5. Проверяем функции
SELECT 
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'update_chat_last_message';

-- 6. Проверяем RLS политики для messages
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE tablename = 'messages';

-- 7. Финальный статус
SELECT 
    'Настройки чатов завершены' as status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chats' AND column_name = 'last_message_id') 
        THEN 'last_message_id: ✅'
        ELSE 'last_message_id: ❌'
    END as chats_structure,
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'messages') 
        THEN 'Realtime: ✅'
        ELSE 'Realtime: ❌'
    END as realtime_status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'trigger_update_chat_last_message') 
        THEN 'Триггер: ✅'
        ELSE 'Триггер: ❌'
    END as trigger_status;
