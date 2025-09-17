-- Простая диагностика календаря

-- 1. Проверяем расписания экспертов
SELECT 
    'РАСПИСАНИЯ ЭКСПЕРТОВ' as check_type,
    COUNT(*) as count,
    COUNT(*) FILTER (WHERE is_active = true) as active_count
FROM expert_schedule;

-- 2. Проверяем временные слоты  
SELECT 
    'ВРЕМЕННЫЕ СЛОТЫ' as check_type,
    COUNT(*) as total_slots,
    COUNT(*) FILTER (WHERE slot_date >= CURRENT_DATE) as future_slots,
    COUNT(*) FILTER (WHERE is_available = true AND slot_date >= CURRENT_DATE) as available_future_slots
FROM time_slots;

-- 3. Проверяем бронирования
SELECT 
    'БРОНИРОВАНИЯ' as check_type,
    COUNT(*) as total_bookings,
    COUNT(*) FILTER (WHERE booking_date >= CURRENT_DATE) as future_bookings,
    COUNT(*) FILTER (WHERE status IN ('pending', 'confirmed')) as active_bookings
FROM bookings;

-- 4. Детали по экспертам
SELECT 
    'ДЕТАЛИ ПО ЭКСПЕРТАМ' as info,
    ts.expert_id,
    p.full_name as expert_name,
    COUNT(ts.id) as total_slots,
    COUNT(ts.id) FILTER (WHERE ts.slot_date >= CURRENT_DATE) as future_slots,
    COUNT(ts.id) FILTER (WHERE ts.is_available = true) as available_slots
FROM time_slots ts
LEFT JOIN profiles p ON p.id = ts.expert_id
GROUP BY ts.expert_id, p.full_name
ORDER BY ts.expert_id;

-- 5. Проверяем слоты на сегодня и завтра
SELECT 
    'СЛОТЫ НА БЛИЖАЙШИЕ ДНИ' as info,
    ts.expert_id,
    ts.slot_date,
    ts.start_time,
    ts.end_time,
    ts.is_available,
    CASE 
        WHEN b.id IS NOT NULL THEN 'Забронирован (' || b.status || ')'
        ELSE 'Свободен'
    END as status
FROM time_slots ts
LEFT JOIN bookings b ON b.slot_id = ts.id AND b.status IN ('pending', 'confirmed')
WHERE ts.slot_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '2 days'
ORDER BY ts.expert_id, ts.slot_date, ts.start_time;

-- 6. Проверяем существование представлений
SELECT 
    'ПРЕДСТАВЛЕНИЯ' as check_type,
    table_name,
    table_type
FROM information_schema.tables
WHERE table_name IN ('all_slots_view', 'available_slots_view')
AND table_schema = 'public';

-- 7. Проверяем функции
SELECT 
    'ФУНКЦИИ' as check_type,
    proname as function_name,
    pronargs as arg_count
FROM pg_proc 
WHERE proname IN ('generate_time_slots', 'update_slot_availability');

-- 8. Проверяем таблицы
SELECT 
    'ТАБЛИЦЫ' as check_type,
    tablename,
    tableowner
FROM pg_tables 
WHERE tablename IN ('time_slots', 'expert_schedule', 'bookings', 'profiles')
AND schemaname = 'public';

-- 9. Быстрая проверка RLS
SELECT 
    'RLS ПОЛИТИКИ' as check_type,
    tablename,
    COUNT(*) as policy_count
FROM pg_policies 
WHERE tablename IN ('time_slots', 'expert_schedule', 'bookings')
GROUP BY tablename
ORDER BY tablename;
