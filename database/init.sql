-- Создание базы данных и пользователя (выполняется автоматически через переменные окружения)
-- CREATE DATABASE platform_db;
-- CREATE USER platform_user WITH PASSWORD 'secure_password_123';
-- GRANT ALL PRIVILEGES ON DATABASE platform_db TO platform_user;

-- Подключение к базе данных platform_db
\c platform_db;

-- Создание расширений
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Создание таблицы профилей пользователей
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    avatar_url TEXT,
    bio TEXT,
    website_url TEXT,
    github_url TEXT,
    linkedin_url TEXT,
    twitter_url TEXT,
    instagram_url TEXT,
    telegram_url TEXT,
    city VARCHAR(255),
    is_expert BOOLEAN DEFAULT FALSE,
    expert_bio TEXT,
    expert_specialization TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создание таблицы статей
CREATE TABLE IF NOT EXISTS articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    published BOOLEAN DEFAULT FALSE,
    excerpt TEXT,
    tags TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создание таблицы дружбы
CREATE TABLE IF NOT EXISTS friendships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    friend_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, friend_id)
);

-- Создание таблицы уведомлений
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSONB,
    read BOOLEAN DEFAULT FALSE,
    action_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создание таблицы чатов
CREATE TABLE IF NOT EXISTS chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255),
    type VARCHAR(20) NOT NULL DEFAULT 'private' CHECK (type IN ('private', 'group')),
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    last_message_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создание таблицы участников чатов
CREATE TABLE IF NOT EXISTS chat_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('member', 'admin', 'owner')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_read_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(chat_id, user_id)
);

-- Создание таблицы сообщений
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file')),
    reply_to UUID REFERENCES messages(id) ON DELETE SET NULL,
    edited_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создание таблицы прочитанных сообщений
CREATE TABLE IF NOT EXISTS message_reads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(message_id, user_id)
);

-- Создание таблицы категорий экспертов
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создание таблицы связей экспертов с категориями
CREATE TABLE IF NOT EXISTS expert_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expert_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(expert_id, category_id)
);

-- Создание таблицы услуг экспертов
CREATE TABLE IF NOT EXISTS expert_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expert_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2),
    duration_minutes INTEGER DEFAULT 60,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создание таблицы расписания экспертов
CREATE TABLE IF NOT EXISTS expert_schedule (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expert_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=воскресенье, 6=суббота
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создание таблицы временных слотов
CREATE TABLE IF NOT EXISTS time_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expert_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    schedule_id UUID REFERENCES expert_schedule(id) ON DELETE CASCADE,
    slot_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_available BOOLEAN DEFAULT TRUE,
    is_booked BOOLEAN DEFAULT FALSE,
    price DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создание таблицы бронирований
CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    expert_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    service_id UUID REFERENCES expert_services(id) ON DELETE SET NULL,
    slot_id UUID REFERENCES time_slots(id) ON DELETE CASCADE,
    booking_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
    notes TEXT,
    total_price DECIMAL(10,2),
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создание таблицы лайков статей
CREATE TABLE IF NOT EXISTS article_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, article_id)
);

-- Создание таблицы избранных статей
CREATE TABLE IF NOT EXISTS article_favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, article_id)
);

-- Создание таблицы отзывов
CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    expert_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(client_id, expert_id, booking_id)
);

-- Создание таблицы заявок к экспертам
CREATE TABLE IF NOT EXISTS expert_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    expert_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    response_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создание таблицы аватаров
CREATE TABLE IF NOT EXISTS avatars (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создание представления для бронирований с дополнительной информацией
CREATE OR REPLACE VIEW bookings_view AS
SELECT 
    b.*,
    c.full_name as client_name,
    c.email as client_email,
    e.full_name as expert_name,
    e.email as expert_email,
    s.title as service_title,
    s.price as service_price,
    s.duration_minutes as service_duration
FROM bookings b
LEFT JOIN profiles c ON b.client_id = c.id
LEFT JOIN profiles e ON b.expert_id = e.id
LEFT JOIN expert_services s ON b.service_id = s.id;

-- Создание индексов для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_articles_author_id ON articles(author_id);
CREATE INDEX IF NOT EXISTS idx_articles_published ON articles(published);
CREATE INDEX IF NOT EXISTS idx_articles_created_at ON articles(created_at);
CREATE INDEX IF NOT EXISTS idx_friendships_user_id ON friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend_id ON friendships(friend_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON friendships(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_participants_chat_id ON chat_participants(chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_participants_user_id ON chat_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_expert_categories_expert_id ON expert_categories(expert_id);
CREATE INDEX IF NOT EXISTS idx_expert_categories_category_id ON expert_categories(category_id);
CREATE INDEX IF NOT EXISTS idx_expert_services_expert_id ON expert_services(expert_id);
CREATE INDEX IF NOT EXISTS idx_expert_services_is_active ON expert_services(is_active);
CREATE INDEX IF NOT EXISTS idx_expert_schedule_expert_id ON expert_schedule(expert_id);
CREATE INDEX IF NOT EXISTS idx_expert_schedule_day_of_week ON expert_schedule(day_of_week);
CREATE INDEX IF NOT EXISTS idx_time_slots_expert_id ON time_slots(expert_id);
CREATE INDEX IF NOT EXISTS idx_time_slots_slot_date ON time_slots(slot_date);
CREATE INDEX IF NOT EXISTS idx_time_slots_is_available ON time_slots(is_available);
CREATE INDEX IF NOT EXISTS idx_bookings_client_id ON bookings(client_id);
CREATE INDEX IF NOT EXISTS idx_bookings_expert_id ON bookings(expert_id);
CREATE INDEX IF NOT EXISTS idx_bookings_booking_date ON bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_article_likes_user_id ON article_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_article_likes_article_id ON article_likes(article_id);
CREATE INDEX IF NOT EXISTS idx_article_favorites_user_id ON article_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_article_favorites_article_id ON article_favorites(article_id);
CREATE INDEX IF NOT EXISTS idx_reviews_client_id ON reviews(client_id);
CREATE INDEX IF NOT EXISTS idx_reviews_expert_id ON reviews(expert_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);
CREATE INDEX IF NOT EXISTS idx_expert_requests_client_id ON expert_requests(client_id);
CREATE INDEX IF NOT EXISTS idx_expert_requests_expert_id ON expert_requests(expert_id);
CREATE INDEX IF NOT EXISTS idx_expert_requests_status ON expert_requests(status);
CREATE INDEX IF NOT EXISTS idx_avatars_user_id ON avatars(user_id);

-- Создание функции для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Создание триггеров для автоматического обновления updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_articles_updated_at BEFORE UPDATE ON articles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_friendships_updated_at BEFORE UPDATE ON friendships
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON notifications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chats_updated_at BEFORE UPDATE ON chats
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expert_services_updated_at BEFORE UPDATE ON expert_services
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expert_schedule_updated_at BEFORE UPDATE ON expert_schedule
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_time_slots_updated_at BEFORE UPDATE ON time_slots
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON reviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expert_requests_updated_at BEFORE UPDATE ON expert_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Создание функции для создания уведомления
CREATE OR REPLACE FUNCTION create_notification(
    p_user_id UUID,
    p_type VARCHAR(50),
    p_title VARCHAR(255),
    p_message TEXT,
    p_data JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    notification_id UUID;
BEGIN
    INSERT INTO notifications (user_id, type, title, message, data)
    VALUES (p_user_id, p_type, p_title, p_message, p_data)
    RETURNING id INTO notification_id;
    
    RETURN notification_id;
END;
$$ LANGUAGE plpgsql;

-- Создание функции для создания приватного чата между двумя пользователями
CREATE OR REPLACE FUNCTION create_private_chat(
    p_user1_id UUID,
    p_user2_id UUID
)
RETURNS UUID AS $$
DECLARE
    chat_id UUID;
BEGIN
    -- Проверяем, существует ли уже приватный чат между этими пользователями
    SELECT c.id INTO chat_id
    FROM chats c
    JOIN chat_participants cp1 ON c.id = cp1.chat_id
    JOIN chat_participants cp2 ON c.id = cp2.chat_id
    WHERE c.type = 'private'
    AND cp1.user_id = p_user1_id
    AND cp2.user_id = p_user2_id;
    
    -- Если чат не существует, создаем его
    IF chat_id IS NULL THEN
        INSERT INTO chats (type, created_by)
        VALUES ('private', p_user1_id)
        RETURNING id INTO chat_id;
        
        -- Добавляем участников
        INSERT INTO chat_participants (chat_id, user_id)
        VALUES (chat_id, p_user1_id), (chat_id, p_user2_id);
    END IF;
    
    RETURN chat_id;
END;
$$ LANGUAGE plpgsql;

-- Вставка тестовых данных (опционально)
-- INSERT INTO profiles (id, email, password_hash, full_name) VALUES 
-- ('550e8400-e29b-41d4-a716-446655440000', 'admin@example.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/9Kz8K2', 'Администратор'),
-- ('550e8400-e29b-41d4-a716-446655440001', 'user@example.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/9Kz8K2', 'Тестовый пользователь');

-- Вставка тестовых категорий экспертов
INSERT INTO categories (name, description) VALUES 
('Психология', 'Консультации по психологическим вопросам'),
('Коучинг', 'Персональный коучинг и развитие'),
('Бизнес', 'Консультации по бизнес-вопросам'),
('Здоровье', 'Консультации по здоровому образу жизни'),
('Образование', 'Образовательные консультации'),
('Технологии', 'Консультации по IT и технологиям')
ON CONFLICT (name) DO NOTHING;

-- Вставка тестовых статей
INSERT INTO articles (title, content, author_id, published, excerpt, tags) VALUES 
('Добро пожаловать на платформу!', 'Это первая статья на нашей платформе. Здесь вы можете делиться своими знаниями и опытом.', '550e8400-e29b-41d4-a716-446655440000', true, 'Приветственная статья', ARRAY['приветствие', 'платформа']),
('Как стать экспертом', 'Руководство по тому, как стать экспертом на нашей платформе и начать помогать другим.', '550e8400-e29b-41d4-a716-446655440000', true, 'Руководство для экспертов', ARRAY['эксперт', 'руководство'])
ON CONFLICT DO NOTHING;

-- Вставка тестовых уведомлений
INSERT INTO notifications (user_id, type, title, message, data) VALUES 
('550e8400-e29b-41d4-a716-446655440000', 'welcome', 'Добро пожаловать!', 'Добро пожаловать на нашу платформу!', '{"action": "welcome"}'),
('550e8400-e29b-41d4-a716-446655440001', 'welcome', 'Добро пожаловать!', 'Добро пожаловать на нашу платформу!', '{"action": "welcome"}')
ON CONFLICT DO NOTHING;

-- Вставка тестовых дружеских связей
INSERT INTO friendships (user_id, friend_id, status) VALUES 
('550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001', 'accepted'),
('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', 'accepted')
ON CONFLICT (user_id, friend_id) DO NOTHING;

-- Вставка тестовых чатов
INSERT INTO chats (type, created_by) VALUES 
('private', '550e8400-e29b-41d4-a716-446655440000')
ON CONFLICT DO NOTHING;

-- Вставка тестовых участников чатов
INSERT INTO chat_participants (chat_id, user_id, role) VALUES 
((SELECT id FROM chats WHERE type = 'private' LIMIT 1), '550e8400-e29b-41d4-a716-446655440000', 'owner'),
((SELECT id FROM chats WHERE type = 'private' LIMIT 1), '550e8400-e29b-41d4-a716-446655440001', 'member')
ON CONFLICT (chat_id, user_id) DO NOTHING;

-- Вставка тестовых сообщений
INSERT INTO messages (chat_id, sender_id, content, message_type) VALUES 
((SELECT id FROM chats WHERE type = 'private' LIMIT 1), '550e8400-e29b-41d4-a716-446655440000', 'Привет! Добро пожаловать на платформу!', 'text'),
((SELECT id FROM chats WHERE type = 'private' LIMIT 1), '550e8400-e29b-41d4-a716-446655440001', 'Спасибо! Рад быть здесь!', 'text')
ON CONFLICT DO NOTHING;

-- Вставка тестовых лайков статей
INSERT INTO article_likes (user_id, article_id) VALUES 
('550e8400-e29b-41d4-a716-446655440001', (SELECT id FROM articles WHERE title = 'Добро пожаловать на платформу!' LIMIT 1))
ON CONFLICT (user_id, article_id) DO NOTHING;

-- Вставка тестовых избранных статей
INSERT INTO article_favorites (user_id, article_id) VALUES 
('550e8400-e29b-41d4-a716-446655440001', (SELECT id FROM articles WHERE title = 'Как стать экспертом' LIMIT 1))
ON CONFLICT (user_id, article_id) DO NOTHING;

-- Вставка тестовых услуг экспертов
INSERT INTO expert_services (expert_id, title, description, price, duration_minutes) VALUES 
('550e8400-e29b-41d4-a716-446655440000', 'Консультация по психологии', 'Персональная консультация по психологическим вопросам', 5000.00, 60),
('550e8400-e29b-41d4-a716-446655440000', 'Коучинг сессия', 'Индивидуальная коучинг сессия для личностного развития', 3000.00, 45)
ON CONFLICT DO NOTHING;

-- Вставка тестового расписания экспертов
INSERT INTO expert_schedule (expert_id, day_of_week, start_time, end_time) VALUES 
('550e8400-e29b-41d4-a716-446655440000', 1, '09:00', '18:00'), -- Понедельник
('550e8400-e29b-41d4-a716-446655440000', 2, '09:00', '18:00'), -- Вторник
('550e8400-e29b-41d4-a716-446655440000', 3, '09:00', '18:00'), -- Среда
('550e8400-e29b-41d4-a716-446655440000', 4, '09:00', '18:00'), -- Четверг
('550e8400-e29b-41d4-a716-446655440000', 5, '09:00', '18:00')  -- Пятница
ON CONFLICT DO NOTHING;

-- Вставка тестовых временных слотов
INSERT INTO time_slots (expert_id, schedule_id, slot_date, start_time, end_time, price) VALUES 
('550e8400-e29b-41d4-a716-446655440000', (SELECT id FROM expert_schedule WHERE day_of_week = 1 LIMIT 1), CURRENT_DATE + INTERVAL '1 day', '09:00', '10:00', 5000.00),
('550e8400-e29b-41d4-a716-446655440000', (SELECT id FROM expert_schedule WHERE day_of_week = 1 LIMIT 1), CURRENT_DATE + INTERVAL '1 day', '10:00', '11:00', 5000.00),
('550e8400-e29b-41d4-a716-446655440000', (SELECT id FROM expert_schedule WHERE day_of_week = 1 LIMIT 1), CURRENT_DATE + INTERVAL '1 day', '11:00', '12:00', 5000.00)
ON CONFLICT DO NOTHING;

-- Вставка тестовых бронирований
INSERT INTO bookings (client_id, expert_id, service_id, slot_id, booking_date, start_time, end_time, status, total_price) VALUES 
('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', (SELECT id FROM expert_services WHERE title = 'Консультация по психологии' LIMIT 1), (SELECT id FROM time_slots WHERE start_time = '09:00' LIMIT 1), CURRENT_DATE + INTERVAL '1 day', '09:00', '10:00', 'confirmed', 5000.00)
ON CONFLICT DO NOTHING;

-- Вставка тестовых отзывов
INSERT INTO reviews (client_id, expert_id, booking_id, rating, comment, is_verified) VALUES 
('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', (SELECT id FROM bookings WHERE status = 'confirmed' LIMIT 1), 5, 'Отличная консультация! Очень помогло.', true)
ON CONFLICT (client_id, expert_id, booking_id) DO NOTHING;

-- Вставка тестовых заявок к экспертам
INSERT INTO expert_requests (client_id, expert_id, message, status) VALUES 
('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', 'Хотел бы записаться на консультацию по психологии. Когда у вас есть свободное время?', 'pending')
ON CONFLICT DO NOTHING;

-- Вставка тестовых аватаров
INSERT INTO avatars (user_id, file_path, file_size, mime_type, is_primary) VALUES 
('550e8400-e29b-41d4-a716-446655440000', '/uploads/avatars/admin.jpg', 102400, 'image/jpeg', true),
('550e8400-e29b-41d4-a716-446655440001', '/uploads/avatars/user.jpg', 102400, 'image/jpeg', true)
ON CONFLICT DO NOTHING;

-- Вставка тестовых связей экспертов с категориями
INSERT INTO expert_categories (expert_id, category_id) VALUES 
('550e8400-e29b-41d4-a716-446655440000', (SELECT id FROM categories WHERE name = 'Психология' LIMIT 1)),
('550e8400-e29b-41d4-a716-446655440000', (SELECT id FROM categories WHERE name = 'Коучинг' LIMIT 1))
ON CONFLICT (expert_id, category_id) DO NOTHING;

-- Вставка тестовых прочитанных сообщений
INSERT INTO message_reads (message_id, user_id) VALUES 
((SELECT id FROM messages WHERE content = 'Привет! Добро пожаловать на платформу!' LIMIT 1), '550e8400-e29b-41d4-a716-446655440001'),
((SELECT id FROM messages WHERE content = 'Спасибо! Рад быть здесь!' LIMIT 1), '550e8400-e29b-41d4-a716-446655440000')
ON CONFLICT (message_id, user_id) DO NOTHING;

-- Вставка тестовых профилей пользователей
INSERT INTO profiles (id, email, password_hash, full_name, city, is_expert, expert_bio, expert_specialization) VALUES 
('550e8400-e29b-41d4-a716-446655440000', 'admin@example.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/9Kz8K2', 'Администратор', 'Москва', true, 'Опытный психолог и коуч с 10-летним стажем', 'Психология, Коучинг'),
('550e8400-e29b-41d4-a716-446655440001', 'user@example.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/9Kz8K2', 'Тестовый пользователь', 'Санкт-Петербург', false, NULL, NULL)
ON CONFLICT (id) DO NOTHING;



-- Комментарии к таблицам
COMMENT ON TABLE profiles IS 'Профили пользователей платформы';
COMMENT ON TABLE articles IS 'Статьи пользователей';
COMMENT ON TABLE friendships IS 'Связи дружбы между пользователями';
COMMENT ON TABLE notifications IS 'Уведомления пользователей';
COMMENT ON TABLE chats IS 'Чаты между пользователями';
COMMENT ON TABLE chat_participants IS 'Участники чатов';
COMMENT ON TABLE messages IS 'Сообщения в чатах';
COMMENT ON TABLE message_reads IS 'Отметки о прочтении сообщений';
COMMENT ON TABLE categories IS 'Категории экспертов';
COMMENT ON TABLE expert_categories IS 'Связи экспертов с категориями';
COMMENT ON TABLE expert_services IS 'Услуги экспертов';
COMMENT ON TABLE expert_schedule IS 'Расписание экспертов';
COMMENT ON TABLE time_slots IS 'Временные слоты для бронирования';
COMMENT ON TABLE bookings IS 'Бронирования услуг';
COMMENT ON TABLE article_likes IS 'Лайки статей';
COMMENT ON TABLE article_favorites IS 'Избранные статьи';
COMMENT ON TABLE reviews IS 'Отзывы о экспертах';
COMMENT ON TABLE expert_requests IS 'Заявки к экспертам';
COMMENT ON TABLE avatars IS 'Аватары пользователей';
