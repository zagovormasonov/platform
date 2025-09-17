-- Календарь занятий экспертов

-- 1. Таблица расписания экспертов (шаблон на неделю)
CREATE TABLE IF NOT EXISTS expert_schedule (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    expert_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0 = Воскресенье, 1 = Понедельник, ..., 6 = Суббота
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 60, -- Длительность одного занятия в минутах
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(expert_id, day_of_week, start_time),
    CHECK (end_time > start_time)
);

-- 2. Таблица временных слотов (генерируется на основе расписания)
CREATE TABLE IF NOT EXISTS time_slots (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    expert_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    schedule_id UUID NOT NULL REFERENCES expert_schedule(id) ON DELETE CASCADE,
    slot_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(expert_id, slot_date, start_time)
);

-- 3. Таблица бронирований
CREATE TABLE IF NOT EXISTS bookings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    expert_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    slot_id UUID NOT NULL REFERENCES time_slots(id) ON DELETE CASCADE,
    service_id UUID REFERENCES expert_services(id) ON DELETE SET NULL,
    booking_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    duration_minutes INTEGER NOT NULL,
    total_price DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'RUB',
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(slot_id)
);

-- 4. Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггеры для обновления updated_at
CREATE TRIGGER update_expert_schedule_updated_at 
    BEFORE UPDATE ON expert_schedule 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at 
    BEFORE UPDATE ON bookings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. Функция для генерации временных слотов на основе расписания
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

-- 6. Функция для обновления доступности слота при бронировании
CREATE OR REPLACE FUNCTION update_slot_availability()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.status IN ('pending', 'confirmed') THEN
        -- Делаем слот недоступным
        UPDATE time_slots 
        SET is_available = false 
        WHERE id = NEW.slot_id;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.status IN ('pending', 'confirmed') AND NEW.status IN ('cancelled') THEN
            -- Освобождаем слот
            UPDATE time_slots 
            SET is_available = true 
            WHERE id = NEW.slot_id;
        ELSIF OLD.status IN ('cancelled') AND NEW.status IN ('pending', 'confirmed') THEN
            -- Занимаем слот
            UPDATE time_slots 
            SET is_available = false 
            WHERE id = NEW.slot_id;
        END IF;
    ELSIF TG_OP = 'DELETE' AND OLD.status IN ('pending', 'confirmed') THEN
        -- Освобождаем слот при удалении бронирования
        UPDATE time_slots 
        SET is_available = true 
        WHERE id = OLD.slot_id;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Триггер для автоматического обновления доступности слотов
CREATE TRIGGER update_slot_availability_trigger
    AFTER INSERT OR UPDATE OR DELETE ON bookings
    FOR EACH ROW EXECUTE FUNCTION update_slot_availability();

-- 7. RLS политики

-- Политики для expert_schedule
ALTER TABLE expert_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Experts can manage their own schedule" ON expert_schedule
    FOR ALL USING (auth.uid() = expert_id);

CREATE POLICY "Users can view expert schedules" ON expert_schedule
    FOR SELECT USING (is_active = true);

-- Политики для time_slots
ALTER TABLE time_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Experts can manage their own slots" ON time_slots
    FOR ALL USING (auth.uid() = expert_id);

CREATE POLICY "Users can view available slots" ON time_slots
    FOR SELECT USING (is_available = true);

-- Политики для bookings
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Experts can view their bookings" ON bookings
    FOR SELECT USING (auth.uid() = expert_id);

CREATE POLICY "Clients can view their bookings" ON bookings
    FOR SELECT USING (auth.uid() = client_id);

CREATE POLICY "Clients can create bookings" ON bookings
    FOR INSERT WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Experts can update their bookings" ON bookings
    FOR UPDATE USING (auth.uid() = expert_id);

CREATE POLICY "Clients can update their bookings" ON bookings
    FOR UPDATE USING (auth.uid() = client_id);

-- 8. Индексы для производительности
CREATE INDEX IF NOT EXISTS idx_expert_schedule_expert_day ON expert_schedule(expert_id, day_of_week);
CREATE INDEX IF NOT EXISTS idx_time_slots_expert_date ON time_slots(expert_id, slot_date);
CREATE INDEX IF NOT EXISTS idx_time_slots_available ON time_slots(expert_id, is_available);
CREATE INDEX IF NOT EXISTS idx_bookings_expert_date ON bookings(expert_id, booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_client_date ON bookings(client_id, booking_date);

-- 9. Представления для удобного получения данных

-- Представление для получения расписания с именами дней
CREATE OR REPLACE VIEW expert_schedule_view AS
SELECT 
    es.*,
    CASE es.day_of_week
        WHEN 0 THEN 'Воскресенье'
        WHEN 1 THEN 'Понедельник'
        WHEN 2 THEN 'Вторник'
        WHEN 3 THEN 'Среда'
        WHEN 4 THEN 'Четверг'
        WHEN 5 THEN 'Пятница'
        WHEN 6 THEN 'Суббота'
    END as day_name,
    p.full_name as expert_name
FROM expert_schedule es
LEFT JOIN profiles p ON p.id = es.expert_id;

-- Представление для получения доступных слотов с информацией об эксперте
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

-- Представление для получения бронирований с информацией
CREATE OR REPLACE VIEW bookings_view AS
SELECT 
    b.*,
    expert.full_name as expert_name,
    expert.avatar_url as expert_avatar,
    client.full_name as client_name,
    client.avatar_url as client_avatar,
    srv.service_name,
    srv.service_description,
    CASE b.status
        WHEN 'pending' THEN 'Ожидает подтверждения'
        WHEN 'confirmed' THEN 'Подтверждено'
        WHEN 'cancelled' THEN 'Отменено'
        WHEN 'completed' THEN 'Завершено'
    END as status_name
FROM bookings b
LEFT JOIN profiles expert ON expert.id = b.expert_id
LEFT JOIN profiles client ON client.id = b.client_id
LEFT JOIN expert_services srv ON srv.id = b.service_id;
