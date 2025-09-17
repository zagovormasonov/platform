-- Проверка и исправление функции generate_time_slots

-- 1. Проверяем существование функции
SELECT 
    'Проверка функции generate_time_slots' as check_name,
    COUNT(*) as found
FROM pg_proc 
WHERE proname = 'generate_time_slots';

-- 2. Проверяем существование таблиц
SELECT 
    'Проверка таблиц' as check_name,
    COUNT(*) as tables_exist
FROM information_schema.tables 
WHERE table_name IN ('expert_schedule', 'time_slots') 
AND table_schema = 'public';

-- 3. Проверяем есть ли расписания экспертов
SELECT 
    'Существующие расписания' as info,
    COUNT(*) as schedule_count,
    COUNT(DISTINCT expert_id) as experts_with_schedule
FROM expert_schedule 
WHERE is_active = true;

-- 4. Проверяем существующие слоты
SELECT 
    'Существующие слоты' as info,
    COUNT(*) as total_slots,
    COUNT(*) FILTER (WHERE slot_date >= NOW()::date) as future_slots,
    COUNT(*) FILTER (WHERE is_available = true) as available_slots
FROM time_slots;

-- 5. Если функция не существует, создаем ее заново
DO $$
BEGIN
    -- Проверяем существование функции
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc WHERE proname = 'generate_time_slots'
    ) THEN
        -- Создаем функцию
        EXECUTE '
        CREATE OR REPLACE FUNCTION generate_time_slots(
            p_expert_id UUID,
            p_start_date DATE,
            p_end_date DATE
        )
        RETURNS void AS $func$
        DECLARE
            schedule_row expert_schedule%ROWTYPE;
            loop_date DATE;
            slot_start_time TIME;
            slot_end_time TIME;
        BEGIN
            -- Удаляем старые слоты для этого периода
            DELETE FROM time_slots 
            WHERE expert_id = p_expert_id 
            AND slot_date BETWEEN p_start_date AND p_end_date;
            
            -- Генерируем слоты для каждого дня в диапазоне
            loop_date := p_start_date;
            
            WHILE loop_date <= p_end_date LOOP
                -- Получаем расписание для текущего дня недели
                FOR schedule_row IN 
                    SELECT * FROM expert_schedule 
                    WHERE expert_id = p_expert_id 
                    AND day_of_week = EXTRACT(DOW FROM loop_date)
                    AND is_active = true
                LOOP
                    -- Генерируем слоты для этого расписания
                    slot_start_time := schedule_row.start_time;
                    
                    WHILE slot_start_time + (schedule_row.duration_minutes || '' minutes'')::INTERVAL <= schedule_row.end_time LOOP
                        slot_end_time := slot_start_time + (schedule_row.duration_minutes || '' minutes'')::INTERVAL;
                        
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
                        END IF;
                        
                        slot_start_time := slot_end_time;
                    END LOOP;
                END LOOP;
                
                loop_date := loop_date + 1;
            END LOOP;
        END;
        $func$ LANGUAGE plpgsql;';
        
        RAISE NOTICE 'Функция generate_time_slots создана';
    ELSE
        RAISE NOTICE 'Функция generate_time_slots уже существует';
    END IF;
END
$$;

-- 6. Тестируем функцию на одном эксперте (если есть расписания)
DO $$
DECLARE
    test_expert_id UUID;
    start_date DATE := NOW()::date;
    end_date DATE := NOW()::date + INTERVAL '7 days';
BEGIN
    -- Находим первого эксперта с расписанием
    SELECT DISTINCT expert_id INTO test_expert_id
    FROM expert_schedule 
    WHERE is_active = true 
    LIMIT 1;
    
    IF test_expert_id IS NOT NULL THEN
        -- Тестируем генерацию слотов
        PERFORM generate_time_slots(test_expert_id, start_date, end_date);
        
        RAISE NOTICE 'Тест генерации слотов выполнен для эксперта %', test_expert_id;
        
        -- Проверяем результат
        RAISE NOTICE 'Создано слотов: %', (
            SELECT COUNT(*) 
            FROM time_slots 
            WHERE expert_id = test_expert_id 
            AND slot_date BETWEEN start_date AND end_date
        );
    ELSE
        RAISE NOTICE 'Нет экспертов с активным расписанием для тестирования';
    END IF;
END
$$;

-- 7. Финальная проверка
SELECT 
    'Финальная статистика' as info,
    COUNT(*) as total_functions
FROM pg_proc 
WHERE proname = 'generate_time_slots';

SELECT 
    'Слоты после проверки' as info,
    COUNT(*) as total_slots,
    COUNT(*) FILTER (WHERE slot_date >= NOW()::date) as future_slots
FROM time_slots;
