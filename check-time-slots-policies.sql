-- Проверка RLS политик для time_slots

-- 1. Детальная проверка политик для time_slots
SELECT 
    'ПОЛИТИКИ time_slots' as info,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'time_slots'
ORDER BY policyname;

-- 2. Проверяем включен ли RLS
SELECT 
    'RLS СТАТУС' as info,
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'time_slots';

-- 3. Тестируем прямой доступ к time_slots от authenticated пользователя
-- (этот запрос покажет, есть ли доступ вообще)
SELECT 
    'ТЕСТ ДОСТУПА' as info,
    COUNT(*) as accessible_slots
FROM time_slots 
WHERE slot_date >= CURRENT_DATE;

-- 4. Проверяем конкретные слоты для эксперта
-- Замените UUID на реальный ID эксперта из вашей системы
SELECT 
    'СЛОТЫ КОНКРЕТНОГО ЭКСПЕРТА' as info,
    expert_id,
    COUNT(*) as total_slots,
    COUNT(*) FILTER (WHERE slot_date >= CURRENT_DATE) as future_slots
FROM time_slots 
-- WHERE expert_id = 'ваш-expert-id-здесь'  -- Раскомментируйте и вставьте реальный ID
GROUP BY expert_id
ORDER BY expert_id;

-- 5. Проверяем представления
SELECT 
    'ПРОВЕРКА ПРЕДСТАВЛЕНИЙ' as info,
    table_name,
    table_type
FROM information_schema.views
WHERE table_name IN ('all_slots_view', 'available_slots_view')
AND table_schema = 'public';

-- 6. Если представление all_slots_view существует, проверяем его содержимое
-- (будет ошибка если представления нет - это нормально)
-- SELECT 
--     'СОДЕРЖИМОЕ all_slots_view' as info,
--     COUNT(*) as slots_in_view
-- FROM all_slots_view
-- WHERE slot_date >= CURRENT_DATE;
