-- Диагностика Realtime для чатов
-- Выполните этот скрипт для проверки настроек Realtime

-- 1. Проверяем существование таблиц
SELECT 
    'Таблицы' as check_type,
    table_name,
    CASE 
        WHEN table_name IN ('chats', 'messages') THEN '✅ Существует'
        ELSE '❌ Отсутствует'
    END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('chats', 'messages')
ORDER BY table_name;

-- 2. Проверяем Realtime публикации
SELECT 
    'Realtime публикации' as check_type,
    schemaname,
    tablename,
    CASE 
        WHEN tablename IN ('chats', 'messages') THEN '✅ Включено'
        ELSE '❌ Не включено'
    END as status
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;

-- 3. Проверяем RLS для таблицы messages
SELECT 
    'RLS политики' as check_type,
    tablename,
    policyname,
    cmd,
    CASE 
        WHEN cmd IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE') THEN '✅ Настроено'
        ELSE '❌ Не настроено'
    END as status
FROM pg_policies 
WHERE tablename = 'messages'
ORDER BY cmd;

-- 4. Проверяем триггеры
SELECT 
    'Триггеры' as check_type,
    trigger_name,
    event_manipulation,
    CASE 
        WHEN trigger_name = 'trigger_update_chat_last_message' THEN '✅ Создан'
        ELSE '❌ Не создан'
    END as status
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_update_chat_last_message';

-- 5. Проверяем функции
SELECT 
    'Функции' as check_type,
    routine_name,
    routine_type,
    CASE 
        WHEN routine_name = 'update_chat_last_message' THEN '✅ Создана'
        ELSE '❌ Не создана'
    END as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'update_chat_last_message';

-- 6. Проверяем структуру таблицы messages
SELECT 
    'Структура messages' as check_type,
    column_name,
    data_type,
    CASE 
        WHEN column_name IN ('id', 'chat_id', 'sender_id', 'content', 'created_at') THEN '✅ Есть'
        ELSE '❌ Отсутствует'
    END as status
FROM information_schema.columns 
WHERE table_name = 'messages' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 7. Проверяем структуру таблицы chats
SELECT 
    'Структура chats' as check_type,
    column_name,
    data_type,
    CASE 
        WHEN column_name IN ('id', 'user1_id', 'user2_id', 'last_message_id', 'created_at', 'updated_at') THEN '✅ Есть'
        ELSE '❌ Отсутствует'
    END as status
FROM information_schema.columns 
WHERE table_name = 'chats' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 8. Финальная диагностика
SELECT 
    'Финальная диагностика' as check_type,
    'Realtime статус' as component,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' 
            AND tablename = 'messages'
        ) THEN '✅ Realtime включен'
        ELSE '❌ Realtime отключен'
    END as status
UNION ALL
SELECT 
    'Финальная диагностика' as check_type,
    'RLS статус' as component,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE tablename = 'messages'
        ) THEN '✅ RLS настроен'
        ELSE '❌ RLS не настроен'
    END as status
UNION ALL
SELECT 
    'Финальная диагностика' as check_type,
    'Триггер статус' as component,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.triggers 
            WHERE trigger_name = 'trigger_update_chat_last_message'
        ) THEN '✅ Триггер создан'
        ELSE '❌ Триггер не создан'
    END as status;
