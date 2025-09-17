-- Исправление представлений для календаря
-- Добавляем представление для всех слотов (не только доступных)

-- Представление для всех временных слотов с информацией об эксперте
CREATE OR REPLACE VIEW all_slots_view AS
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
WHERE ts.slot_date >= NOW()::date;

-- Обновляем available_slots_view для совместимости
DROP VIEW IF EXISTS available_slots_view;
CREATE OR REPLACE VIEW available_slots_view AS
SELECT * FROM all_slots_view
WHERE is_available = true;
