-- Скрипт для диагностики данных календаря

-- 1. Проверяем расписания экспертов
SELECT 
    'РАСПИСАНИЯ ЭКСПЕРТОВ' as info,
    es.expert_id,
    p.full_name as expert_name,
    es.day_of_week,
    CASE es.day_of_week
        WHEN 0 THEN 'Воскресенье'
        WHEN 1 THEN 'Понедельник'
        WHEN 2 THEN 'Вторник'
        WHEN 3 THEN 'Среда'
        WHEN 4 THEN 'Четверг'
        WHEN 5 THEN 'Пятница'
        WHEN 6 THEN 'Суббота'
    END as day_name,
    es.start_time,
    es.end_time,
    es.duration_minutes,
    es.is_active
FROM expert_schedule es
LEFT JOIN profiles p ON p.id = es.expert_id
ORDER BY es.expert_id, es.day_of_week;

-- 2. Проверяем временные слоты
SELECT 
    'ВРЕМЕННЫЕ СЛОТЫ' as info,
    ts.expert_id,
    p.full_name as expert_name,
    COUNT(*) as total_slots,
    COUNT(*) FILTER (WHERE ts.slot_date >= NOW()::date) as future_slots,
    COUNT(*) FILTER (WHERE ts.is_available = true) as available_slots,
    COUNT(*) FILTER (WHERE ts.is_available = false) as unavailable_slots,
    MIN(ts.slot_date) as first_date,
    MAX(ts.slot_date) as last_date
FROM time_slots ts
LEFT JOIN profiles p ON p.id = ts.expert_id
GROUP BY ts.expert_id, p.full_name
ORDER BY ts.expert_id;

-- 3. Детальный просмотр слотов на ближайшие дни
SELECT 
    'СЛОТЫ НА БЛИЖАЙШИЕ ДНИ' as info,
    ts.expert_id,
    p.full_name as expert_name,
    ts.slot_date,
    EXTRACT(DOW FROM ts.slot_date) as day_of_week,
    ts.start_time,
    ts.end_time,
    ts.is_available,
    CASE 
        WHEN b.id IS NOT NULL THEN 'Забронирован'
        ELSE 'Свободен'
    END as booking_status
FROM time_slots ts
LEFT JOIN profiles p ON p.id = ts.expert_id
LEFT JOIN bookings b ON b.slot_id = ts.id AND b.status IN ('pending', 'confirmed')
WHERE ts.slot_date BETWEEN NOW()::date AND NOW()::date + INTERVAL '7 days'
ORDER BY ts.expert_id, ts.slot_date, ts.start_time;

-- 4. Проверяем бронирования
SELECT 
    'БРОНИРОВАНИЯ' as info,
    b.expert_id,
    expert.full_name as expert_name,
    b.client_id,
    client.full_name as client_name,
    b.booking_date,
    b.start_time,
    b.end_time,
    b.status,
    b.slot_id
FROM bookings b
LEFT JOIN profiles expert ON expert.id = b.expert_id
LEFT JOIN profiles client ON client.id = b.client_id
WHERE b.booking_date >= NOW()::date
ORDER BY b.expert_id, b.booking_date, b.start_time;

-- 5. Проверяем существование представлений
SELECT 
    'СУЩЕСТВОВАНИЕ ПРЕДСТАВЛЕНИЙ' as info,
    table_name as view_name,
    table_type
FROM information_schema.tables
WHERE table_name IN ('all_slots_view', 'available_slots_view')
AND table_schema = 'public';

-- Проверяем данные в представлениях (если они существуют)
DO $$
DECLARE
    slots_count INTEGER;
BEGIN
    -- Проверяем all_slots_view
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'all_slots_view' AND table_schema = 'public'
    ) THEN
        RAISE NOTICE 'Представление all_slots_view существует, проверяем данные...';
        
        EXECUTE 'SELECT COUNT(*) FROM all_slots_view WHERE slot_date >= NOW()::date' 
        INTO slots_count;
        
        RAISE NOTICE 'Слотов в all_slots_view: %', slots_count;
    ELSE
        RAISE NOTICE 'Представление all_slots_view НЕ существует';
    END IF;
    
    -- Проверяем available_slots_view
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'available_slots_view' AND table_schema = 'public'
    ) THEN
        RAISE NOTICE 'Представление available_slots_view существует';
        
        EXECUTE 'SELECT COUNT(*) FROM available_slots_view' 
        INTO slots_count;
        
        RAISE NOTICE 'Доступных слотов в available_slots_view: %', slots_count;
    ELSE
        RAISE NOTICE 'Представление available_slots_view НЕ существует';
    END IF;
END
$$;

-- 6. Проверяем функцию generate_time_slots
SELECT 
    'ФУНКЦИЯ generate_time_slots' as info,
    COUNT(*) as function_exists
FROM pg_proc 
WHERE proname = 'generate_time_slots';

-- 7. Проверяем существование таблиц
SELECT 
    'СУЩЕСТВОВАНИЕ ТАБЛИЦ' as info,
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE tablename IN ('time_slots', 'expert_schedule', 'bookings')
AND schemaname = 'public';

-- 8. Проверяем RLS политики
SELECT 
    'RLS ПОЛИТИКИ' as info,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename IN ('time_slots', 'expert_schedule', 'bookings')
ORDER BY tablename, policyname;
