-- Исправление проблем с бронированием календаря
-- Выполните в Supabase Dashboard -> SQL Editor

-- ========================================
-- ЧАСТЬ 1: Очистка старых данных
-- ========================================

-- Удаляем старые слоты (опционально)
-- DELETE FROM time_slots WHERE slot_date < CURRENT_DATE;

-- ========================================
-- ЧАСТЬ 2: Проверка и создание расписания для тестов
-- ========================================

-- Создаем тестовое расписание если его нет
DO $$
DECLARE
    expert_id_var UUID;
    schedule_count INTEGER;
BEGIN
    -- Получаем первого эксперта
    SELECT id INTO expert_id_var 
    FROM profiles 
    WHERE user_type = 'expert' 
    LIMIT 1;
    
    IF expert_id_var IS NOT NULL THEN
        -- Проверяем есть ли у него расписание
        SELECT COUNT(*) INTO schedule_count
        FROM expert_schedule 
        WHERE expert_id = expert_id_var AND is_active = true;
        
        IF schedule_count = 0 THEN
            -- Создаем расписание на понедельник-пятницу
            INSERT INTO expert_schedule (expert_id, day_of_week, start_time, end_time, duration_minutes, is_active)
            VALUES 
                (expert_id_var, 1, '09:00', '17:00', 60, true), -- Понедельник
                (expert_id_var, 2, '09:00', '17:00', 60, true), -- Вторник
                (expert_id_var, 3, '09:00', '17:00', 60, true), -- Среда
                (expert_id_var, 4, '09:00', '17:00', 60, true), -- Четверг
                (expert_id_var, 5, '09:00', '17:00', 60, true); -- Пятница
            
            RAISE NOTICE 'Создано тестовое расписание для эксперта: %', expert_id_var;
        ELSE
            RAISE NOTICE 'У эксперта % уже есть расписание: % записей', expert_id_var, schedule_count;
        END IF;
    ELSE
        RAISE NOTICE 'Экспертов не найдено в системе';
    END IF;
END $$;

-- ========================================
-- ЧАСТЬ 3: Улучшенная функция генерации слотов
-- ========================================

CREATE OR REPLACE FUNCTION generate_time_slots_improved(
    p_expert_id UUID,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS TABLE(
    created_slots INTEGER,
    processed_dates INTEGER,
    error_message TEXT
) AS $$
DECLARE
    schedule_row expert_schedule%ROWTYPE;
    loop_date DATE;
    slot_start_time TIME;
    slot_end_time TIME;
    created_count INTEGER := 0;
    date_count INTEGER := 0;
    current_dow INTEGER;
BEGIN
    -- Логируем начало работы
    RAISE NOTICE 'Генерация слотов для эксперта % с % по %', p_expert_id, p_start_date, p_end_date;
    
    -- Удаляем старые слоты для этого периода
    DELETE FROM time_slots 
    WHERE expert_id = p_expert_id 
    AND slot_date BETWEEN p_start_date AND p_end_date;
    
    RAISE NOTICE 'Удалены старые слоты';
    
    -- Генерируем слоты для каждого дня в диапазоне
    loop_date := p_start_date;
    
    WHILE loop_date <= p_end_date LOOP
        date_count := date_count + 1;
        current_dow := EXTRACT(DOW FROM loop_date);
        
        RAISE NOTICE 'Обрабатываем дату: % (день недели: %)', loop_date, current_dow;
        
        -- Ищем активное расписание для этого дня недели
        FOR schedule_row IN 
            SELECT * FROM expert_schedule 
            WHERE expert_id = p_expert_id 
            AND day_of_week = current_dow
            AND is_active = true
        LOOP
            RAISE NOTICE 'Найдено расписание: % - % (длительность: % мин)', 
                schedule_row.start_time, schedule_row.end_time, schedule_row.duration_minutes;
            
            -- Генерируем слоты для этого расписания
            slot_start_time := schedule_row.start_time;
            
            WHILE slot_start_time + (schedule_row.duration_minutes || ' minutes')::INTERVAL <= schedule_row.end_time LOOP
                slot_end_time := slot_start_time + (schedule_row.duration_minutes || ' minutes')::INTERVAL;
                
                -- Проверяем, что время окончания не превышает время окончания работы
                IF slot_end_time <= schedule_row.end_time THEN
                    INSERT INTO time_slots (
                        expert_id,
                        schedule_id,
                        slot_date,
                        start_time,
                        end_time,
                        is_available
                    ) VALUES (
                        p_expert_id,
                        schedule_row.id,
                        loop_date,
                        slot_start_time,
                        slot_end_time,
                        true
                    ) ON CONFLICT (expert_id, slot_date, start_time) DO NOTHING;
                    
                    created_count := created_count + 1;
                END IF;
                
                slot_start_time := slot_end_time;
            END LOOP;
        END LOOP;
        
        loop_date := loop_date + 1;
    END LOOP;
    
    RAISE NOTICE 'Генерация завершена. Создано слотов: %, обработано дат: %', created_count, date_count;
    
    RETURN QUERY SELECT created_count, date_count, ''::TEXT;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- ЧАСТЬ 4: Генерация слотов на текущую неделю
-- ========================================

-- Генерируем слоты для всех экспертов на ближайшие 2 недели
DO $$
DECLARE
    expert_rec RECORD;
    result_rec RECORD;
    start_date DATE := CURRENT_DATE;
    end_date DATE := CURRENT_DATE + INTERVAL '14 days';
BEGIN
    RAISE NOTICE 'Начинаем генерацию слотов с % по %', start_date, end_date;
    
    FOR expert_rec IN 
        SELECT id, full_name FROM profiles WHERE user_type = 'expert'
    LOOP
        RAISE NOTICE 'Генерируем слоты для эксперта: % (ID: %)', expert_rec.full_name, expert_rec.id;
        
        -- Используем улучшенную функцию
        SELECT * INTO result_rec 
        FROM generate_time_slots_improved(expert_rec.id, start_date, end_date);
        
        RAISE NOTICE 'Результат для %: создано слотов %, обработано дат %', 
            expert_rec.full_name, result_rec.created_slots, result_rec.processed_dates;
    END LOOP;
    
    RAISE NOTICE 'Генерация для всех экспертов завершена';
END $$;

-- ========================================
-- ЧАСТЬ 5: Проверка результата
-- ========================================

-- Показываем созданные слоты
SELECT 
    'СОЗДАННЫЕ СЛОТЫ:' as info,
    p.full_name as expert_name,
    ts.slot_date,
    CASE EXTRACT(DOW FROM ts.slot_date)
        WHEN 0 THEN 'Воскресенье'
        WHEN 1 THEN 'Понедельник'
        WHEN 2 THEN 'Вторник'
        WHEN 3 THEN 'Среда'
        WHEN 4 THEN 'Четверг'
        WHEN 5 THEN 'Пятница'
        WHEN 6 THEN 'Суббота'
    END as day_name,
    COUNT(*) as slots_count,
    MIN(ts.start_time) as first_slot,
    MAX(ts.end_time) as last_slot
FROM time_slots ts
JOIN profiles p ON ts.expert_id = p.id
WHERE ts.slot_date >= CURRENT_DATE
AND ts.slot_date <= CURRENT_DATE + INTERVAL '7 days'
GROUP BY p.full_name, ts.slot_date, EXTRACT(DOW FROM ts.slot_date)
ORDER BY ts.slot_date, p.full_name;

-- Права доступа
GRANT EXECUTE ON FUNCTION generate_time_slots_improved(UUID, DATE, DATE) TO authenticated;
