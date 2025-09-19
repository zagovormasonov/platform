-- Диагностика проблем с бронированием календаря эксперта
-- Выполните в Supabase Dashboard -> SQL Editor

-- ========================================
-- ЧАСТЬ 1: Проверка расписания эксперта
-- ========================================

-- Получаем ID экспертов
SELECT 
    'ЭКСПЕРТЫ В СИСТЕМЕ:' as info,
    p.id as expert_id,
    p.full_name,
    p.user_type
FROM profiles p 
WHERE p.user_type = 'expert'
ORDER BY p.full_name;

-- Проверяем расписание экспертов
SELECT 
    'РАСПИСАНИЕ ЭКСПЕРТОВ:' as info,
    es.expert_id,
    p.full_name,
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
    es.is_active,
    es.created_at
FROM expert_schedule es
LEFT JOIN profiles p ON es.expert_id = p.id
ORDER BY es.expert_id, es.day_of_week;

-- ========================================
-- ЧАСТЬ 2: Проверка временных слотов
-- ========================================

-- Проверяем существующие слоты
SELECT 
    'ВРЕМЕННЫЕ СЛОТЫ:' as info,
    ts.expert_id,
    p.full_name,
    ts.slot_date,
    EXTRACT(DOW FROM ts.slot_date) as day_of_week,
    CASE EXTRACT(DOW FROM ts.slot_date)
        WHEN 0 THEN 'Воскресенье'
        WHEN 1 THEN 'Понедельник'
        WHEN 2 THEN 'Вторник'
        WHEN 3 THEN 'Среда'
        WHEN 4 THEN 'Четверг'
        WHEN 5 THEN 'Пятница'
        WHEN 6 THEN 'Суббота'
    END as day_name,
    ts.start_time,
    ts.end_time,
    ts.is_available,
    ts.created_at
FROM time_slots ts
LEFT JOIN profiles p ON ts.expert_id = p.id
WHERE ts.slot_date >= CURRENT_DATE - INTERVAL '7 days'
AND ts.slot_date <= CURRENT_DATE + INTERVAL '7 days'
ORDER BY ts.expert_id, ts.slot_date, ts.start_time;

-- ========================================
-- ЧАСТЬ 3: Проверка дат и дней недели
-- ========================================

-- Анализируем текущую неделю
SELECT 
    'АНАЛИЗ ТЕКУЩЕЙ НЕДЕЛИ:' as info,
    date_val,
    EXTRACT(DOW FROM date_val) as day_of_week_num,
    CASE EXTRACT(DOW FROM date_val)
        WHEN 0 THEN 'Воскресенье'
        WHEN 1 THEN 'Понедельник'
        WHEN 2 THEN 'Вторник'
        WHEN 3 THEN 'Среда'
        WHEN 4 THEN 'Четверг'
        WHEN 5 THEN 'Пятница'
        WHEN 6 THEN 'Суббота'
    END as day_name
FROM generate_series(
    CURRENT_DATE - INTERVAL '3 days',
    CURRENT_DATE + INTERVAL '10 days',
    INTERVAL '1 day'
) as date_val
ORDER BY date_val;

-- ========================================
-- ЧАСТЬ 4: Проверка функции генерации слотов
-- ========================================

-- Проверяем существование функции generate_time_slots
SELECT 
    'ФУНКЦИЯ GENERATE_TIME_SLOTS:' as info,
    proname as function_name,
    prosrc as function_body
FROM pg_proc 
WHERE proname = 'generate_time_slots';

-- ========================================
-- ЧАСТЬ 5: Диагностика конкретной проблемы
-- ========================================

-- Для каждого эксперта проверяем почему нет слотов на определенные дни
DO $$
DECLARE
    expert_rec RECORD;
    date_rec RECORD;
    schedule_count INTEGER;
    slot_count INTEGER;
BEGIN
    -- Проходим по всем экспертам
    FOR expert_rec IN 
        SELECT id, full_name FROM profiles WHERE user_type = 'expert'
    LOOP
        RAISE NOTICE 'ЭКСПЕРТ: % (ID: %)', expert_rec.full_name, expert_rec.id;
        
        -- Проверяем даты с 22 по 28 сентября 2025
        FOR date_rec IN 
            SELECT generate_series('2025-09-22'::date, '2025-09-28'::date, '1 day'::interval)::date as check_date
        LOOP
            -- Проверяем есть ли расписание на этот день недели
            SELECT COUNT(*) INTO schedule_count
            FROM expert_schedule 
            WHERE expert_id = expert_rec.id 
            AND day_of_week = EXTRACT(DOW FROM date_rec.check_date)
            AND is_active = true;
            
            -- Проверяем есть ли слоты на эту дату
            SELECT COUNT(*) INTO slot_count
            FROM time_slots 
            WHERE expert_id = expert_rec.id 
            AND slot_date = date_rec.check_date;
            
            RAISE NOTICE '  Дата: % (день недели: %) - Расписание: %, Слоты: %', 
                date_rec.check_date, 
                EXTRACT(DOW FROM date_rec.check_date),
                schedule_count,
                slot_count;
        END LOOP;
        
        RAISE NOTICE '---';
    END LOOP;
END $$;

-- ========================================
-- ЧАСТЬ 6: Попытка ручной генерации слотов
-- ========================================

-- Ручная генерация слотов для тестирования
-- (выполните только если нет слотов)

-- Получаем первого эксперта для теста
DO $$
DECLARE
    test_expert_id UUID;
BEGIN
    SELECT id INTO test_expert_id 
    FROM profiles 
    WHERE user_type = 'expert' 
    LIMIT 1;
    
    IF test_expert_id IS NOT NULL THEN
        RAISE NOTICE 'Попытка генерации слотов для эксперта: %', test_expert_id;
        
        -- Вызываем функцию генерации
        PERFORM generate_time_slots(
            test_expert_id,
            '2025-09-22'::date,
            '2025-09-28'::date
        );
        
        RAISE NOTICE 'Генерация завершена';
        
        -- Проверяем результат
        RAISE NOTICE 'Создано слотов: %', (
            SELECT COUNT(*) 
            FROM time_slots 
            WHERE expert_id = test_expert_id 
            AND slot_date BETWEEN '2025-09-22' AND '2025-09-28'
        );
    ELSE
        RAISE NOTICE 'Экспертов не найдено';
    END IF;
END $$;
