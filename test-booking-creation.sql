-- Скрипт для создания тестового бронирования
-- Запустите этот скрипт после настройки расписания эксперта

-- 1. Проверяем, есть ли доступные слоты
SELECT 
    ts.id,
    ts.expert_id,
    ts.slot_date,
    ts.start_time,
    ts.end_time,
    ts.is_available,
    p.full_name as expert_name
FROM time_slots ts
LEFT JOIN profiles p ON p.id = ts.expert_id
WHERE ts.is_available = true
AND ts.slot_date >= CURRENT_DATE
ORDER BY ts.slot_date, ts.start_time
LIMIT 5;

-- 2. Создаем тестовое бронирование для первого доступного слота
-- ВНИМАНИЕ: Замените значения на реальные ID из вашей системы

INSERT INTO bookings (
    expert_id,
    client_id,
    slot_id,
    booking_date,
    start_time,
    end_time,
    duration_minutes,
    status,
    notes
) 
SELECT 
    ts.expert_id,
    '00000000-0000-0000-0000-000000000000', -- Замените на реальный ID клиента
    ts.id,
    ts.slot_date,
    ts.start_time,
    ts.end_time,
    60,
    'confirmed',
    'Тестовое бронирование'
FROM time_slots ts
WHERE ts.is_available = true
AND ts.slot_date >= CURRENT_DATE
ORDER BY ts.slot_date, ts.start_time
LIMIT 1;

-- 3. Проверяем, что слот стал недоступным
SELECT 
    ts.id,
    ts.expert_id,
    ts.slot_date,
    ts.start_time,
    ts.end_time,
    ts.is_available,
    b.client_id,
    b.status
FROM time_slots ts
LEFT JOIN bookings b ON b.slot_id = ts.id
WHERE ts.expert_id IN (
    SELECT DISTINCT expert_id FROM time_slots WHERE slot_date >= CURRENT_DATE
)
AND ts.slot_date >= CURRENT_DATE
ORDER BY ts.slot_date, ts.start_time
LIMIT 10;
