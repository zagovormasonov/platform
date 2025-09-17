-- Исправление для функции generate_time_slots
-- Проблема: current_date - зарезервированное слово в PostgreSQL

DROP FUNCTION IF EXISTS generate_time_slots(UUID, DATE, DATE);

CREATE OR REPLACE FUNCTION generate_time_slots(
    p_expert_id UUID,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS void AS $$
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
                END IF;
                
                slot_start_time := slot_end_time;
            END LOOP;
        END LOOP;
        
        loop_date := loop_date + 1;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Исправление представления available_slots_view
DROP VIEW IF EXISTS available_slots_view;

CREATE OR REPLACE VIEW available_slots_view AS
SELECT 
    ts.*,
    p.full_name as expert_name,
    p.avatar_url as expert_avatar,
    es.duration_minutes,
    EXTRACT(DOW FROM ts.slot_date) as day_of_week,
    CASE EXTRACT(DOW FROM ts.slot_date)
        WHEN 0 THEN 'Воскресенье'
        WHEN 1 THEN 'Понедельник'
        WHEN 2 THEN 'Вторник'
        WHEN 3 THEN 'Среда'
        WHEN 4 THEN 'Четверг'
        WHEN 5 THEN 'Пятница'
        WHEN 6 THEN 'Суббота'
    END as day_name
FROM time_slots ts
LEFT JOIN profiles p ON p.id = ts.expert_id
LEFT JOIN expert_schedule es ON es.id = ts.schedule_id
WHERE ts.is_available = true
AND ts.slot_date >= NOW()::date;
