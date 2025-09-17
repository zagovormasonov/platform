-- Исправление проблемы с доступностью слотов
-- Ручное обновление слотов на основе существующих бронирований

-- 1. Проверяем текущее состояние
SELECT 
    'До исправления' as status,
    COUNT(*) as total_slots,
    COUNT(*) FILTER (WHERE is_available = true) as available_slots,
    COUNT(*) FILTER (WHERE is_available = false) as unavailable_slots
FROM time_slots 
WHERE slot_date >= NOW()::date;

-- 2. Обновляем слоты на основе существующих бронирований
UPDATE time_slots 
SET is_available = false 
WHERE id IN (
    SELECT DISTINCT b.slot_id 
    FROM bookings b 
    WHERE b.status IN ('pending', 'confirmed')
    AND b.booking_date >= NOW()::date
);

-- 3. Проверяем результат
SELECT 
    'После исправления' as status,
    COUNT(*) as total_slots,
    COUNT(*) FILTER (WHERE is_available = true) as available_slots,
    COUNT(*) FILTER (WHERE is_available = false) as unavailable_slots
FROM time_slots 
WHERE slot_date >= NOW()::date;

-- 4. Показываем детальную информацию
SELECT 
    ts.id as slot_id,
    ts.slot_date,
    ts.start_time,
    ts.end_time,
    ts.is_available,
    CASE 
        WHEN b.id IS NOT NULL THEN 'Есть бронирование'
        ELSE 'Нет бронирования'
    END as has_booking,
    b.status as booking_status,
    b.client_id
FROM time_slots ts
LEFT JOIN bookings b ON b.slot_id = ts.id AND b.status IN ('pending', 'confirmed')
WHERE ts.slot_date >= NOW()::date
ORDER BY ts.slot_date, ts.start_time;

-- 5. Пересоздаем триггер для будущих бронирований
DROP TRIGGER IF EXISTS update_slot_availability_trigger ON bookings;

CREATE OR REPLACE FUNCTION update_slot_availability()
RETURNS TRIGGER AS $$
BEGIN
    -- Логируем вызов триггера
    RAISE NOTICE 'Триггер update_slot_availability: операция=%, статус=%, slot_id=%', 
        TG_OP, 
        CASE WHEN TG_OP = 'DELETE' THEN OLD.status ELSE NEW.status END,
        CASE WHEN TG_OP = 'DELETE' THEN OLD.slot_id ELSE NEW.slot_id END;
    
    IF TG_OP = 'INSERT' AND NEW.status IN ('pending', 'confirmed') THEN
        -- Делаем слот недоступным
        UPDATE time_slots 
        SET is_available = false 
        WHERE id = NEW.slot_id;
        
        RAISE NOTICE 'Слот % помечен как недоступный', NEW.slot_id;
        
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.status IN ('pending', 'confirmed') AND NEW.status IN ('cancelled') THEN
            -- Освобождаем слот
            UPDATE time_slots 
            SET is_available = true 
            WHERE id = NEW.slot_id;
            
            RAISE NOTICE 'Слот % освобожден (отмена)', NEW.slot_id;
            
        ELSIF OLD.status IN ('cancelled') AND NEW.status IN ('pending', 'confirmed') THEN
            -- Занимаем слот
            UPDATE time_slots 
            SET is_available = false 
            WHERE id = NEW.slot_id;
            
            RAISE NOTICE 'Слот % занят (восстановление)', NEW.slot_id;
        END IF;
        
    ELSIF TG_OP = 'DELETE' AND OLD.status IN ('pending', 'confirmed') THEN
        -- Освобождаем слот при удалении бронирования
        UPDATE time_slots 
        SET is_available = true 
        WHERE id = OLD.slot_id;
        
        RAISE NOTICE 'Слот % освобожден (удаление)', OLD.slot_id;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Создаем триггер заново
CREATE TRIGGER update_slot_availability_trigger
    AFTER INSERT OR UPDATE OR DELETE ON bookings
    FOR EACH ROW EXECUTE FUNCTION update_slot_availability();

-- 6. Финальная проверка
SELECT 
    'Финальная проверка' as status,
    COUNT(*) as total_slots,
    COUNT(*) FILTER (WHERE is_available = true) as available_slots,
    COUNT(*) FILTER (WHERE is_available = false) as unavailable_slots
FROM time_slots 
WHERE slot_date >= NOW()::date;
