-- Создание таблицы услуг для экспертов
-- Выполните эти команды в SQL Editor вашего проекта Supabase

-- Создание таблицы услуг
CREATE TABLE IF NOT EXISTS expert_services (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  expert_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  service_name TEXT NOT NULL,
  service_description TEXT,
  price INTEGER NOT NULL CHECK (price >= 100 AND price <= 20000),
  currency TEXT DEFAULT 'RUB',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создание индексов для оптимизации
CREATE INDEX IF NOT EXISTS idx_expert_services_expert_id ON expert_services(expert_id);
CREATE INDEX IF NOT EXISTS idx_expert_services_active ON expert_services(is_active);

-- Создание функции для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Создание триггера для автоматического обновления updated_at
DROP TRIGGER IF EXISTS update_expert_services_updated_at ON expert_services;
CREATE TRIGGER update_expert_services_updated_at
    BEFORE UPDATE ON expert_services
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Настройка RLS (Row Level Security)
ALTER TABLE expert_services ENABLE ROW LEVEL SECURITY;

-- Политика: эксперты могут видеть и управлять своими услугами
CREATE POLICY "Experts can manage their own services" ON expert_services
    FOR ALL USING (
        expert_id = auth.uid() OR 
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.user_type = 'expert'
        )
    );

-- Политика: все пользователи могут видеть активные услуги экспертов
CREATE POLICY "Users can view active services" ON expert_services
    FOR SELECT USING (is_active = TRUE);

-- Комментарии к таблице и полям
COMMENT ON TABLE expert_services IS 'Услуги, предоставляемые экспертами';
COMMENT ON COLUMN expert_services.expert_id IS 'ID эксперта, предоставляющего услугу';
COMMENT ON COLUMN expert_services.service_name IS 'Название услуги';
COMMENT ON COLUMN expert_services.service_description IS 'Описание услуги';
COMMENT ON COLUMN expert_services.price IS 'Цена услуги в рублях (от 100 до 20000)';
COMMENT ON COLUMN expert_services.currency IS 'Валюта (по умолчанию RUB)';
COMMENT ON COLUMN expert_services.is_active IS 'Активна ли услуга для отображения';
