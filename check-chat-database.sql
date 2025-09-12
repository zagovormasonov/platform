-- Проверка структуры базы данных для чатов
-- Выполните этот скрипт в SQL Editor Supabase для диагностики

-- Проверяем существование таблиц
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('chats', 'messages')
ORDER BY table_name;

-- Проверяем структуру таблицы chats
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'chats' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Проверяем структуру таблицы messages
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'messages' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Проверяем существование функции get_or_create_chat
SELECT 
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'get_or_create_chat';

-- Проверяем RLS политики для таблицы chats
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
WHERE tablename = 'chats';

-- Проверяем RLS политики для таблицы messages
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

-- Проверяем включен ли RLS для таблиц
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename IN ('chats', 'messages');
