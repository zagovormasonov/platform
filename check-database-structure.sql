-- Скрипт для проверки существующей структуры базы данных
-- Выполните этот скрипт, чтобы увидеть текущую структуру

-- Проверка существования таблиц
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('profiles', 'articles', 'friendships')
ORDER BY tablename;

-- Проверка структуры таблицы profiles
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Проверка существующих политик RLS
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
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Проверка существующих функций
SELECT 
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines 
WHERE routine_schema = 'public'
AND routine_name LIKE '%user%'
ORDER BY routine_name;
