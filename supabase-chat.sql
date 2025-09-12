-- Создание системы чатов в реальном времени
-- Выполните эти команды в SQL Editor вашего проекта Supabase

-- Создание таблицы чатов
CREATE TABLE IF NOT EXISTS chats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  participant_1 UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  participant_2 UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_message_text TEXT,
  last_message_sender_id UUID REFERENCES profiles(id),
  UNIQUE(participant_1, participant_2)
);

-- Создание таблицы сообщений
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file')),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создание индексов для оптимизации
CREATE INDEX IF NOT EXISTS idx_chats_participant_1 ON chats(participant_1);
CREATE INDEX IF NOT EXISTS idx_chats_participant_2 ON chats(participant_2);
CREATE INDEX IF NOT EXISTS idx_chats_last_message_at ON chats(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_is_read ON messages(is_read);

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггеры для автоматического обновления updated_at
DROP TRIGGER IF EXISTS update_chats_updated_at ON chats;
CREATE TRIGGER update_chats_updated_at
    BEFORE UPDATE ON chats
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_messages_updated_at ON messages;
CREATE TRIGGER update_messages_updated_at
    BEFORE UPDATE ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Функция для обновления последнего сообщения в чате
CREATE OR REPLACE FUNCTION update_chat_last_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE chats 
    SET 
        last_message_at = NEW.created_at,
        last_message_text = NEW.content,
        last_message_sender_id = NEW.sender_id,
        updated_at = NOW()
    WHERE id = NEW.chat_id;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггер для автоматического обновления последнего сообщения
DROP TRIGGER IF EXISTS update_chat_last_message_trigger ON messages;
CREATE TRIGGER update_chat_last_message_trigger
    AFTER INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_chat_last_message();

-- Настройка RLS (Row Level Security)
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Политики для чатов
CREATE POLICY "Users can view their own chats" ON chats
    FOR SELECT USING (
        participant_1 = auth.uid() OR 
        participant_2 = auth.uid()
    );

CREATE POLICY "Users can create chats" ON chats
    FOR INSERT WITH CHECK (
        participant_1 = auth.uid() OR 
        participant_2 = auth.uid()
    );

CREATE POLICY "Users can update their own chats" ON chats
    FOR UPDATE USING (
        participant_1 = auth.uid() OR 
        participant_2 = auth.uid()
    );

-- Политики для сообщений
CREATE POLICY "Users can view messages in their chats" ON messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM chats 
            WHERE chats.id = messages.chat_id 
            AND (chats.participant_1 = auth.uid() OR chats.participant_2 = auth.uid())
        )
    );

CREATE POLICY "Users can send messages in their chats" ON messages
    FOR INSERT WITH CHECK (
        sender_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM chats 
            WHERE chats.id = messages.chat_id 
            AND (chats.participant_1 = auth.uid() OR chats.participant_2 = auth.uid())
        )
    );

CREATE POLICY "Users can update their own messages" ON messages
    FOR UPDATE USING (sender_id = auth.uid());

-- Функция для создания или получения чата между двумя пользователями
CREATE OR REPLACE FUNCTION get_or_create_chat(user1_id UUID, user2_id UUID)
RETURNS UUID AS $$
DECLARE
    chat_id UUID;
BEGIN
    -- Проверяем, существует ли уже чат
    SELECT id INTO chat_id
    FROM chats
    WHERE (participant_1 = user1_id AND participant_2 = user2_id)
       OR (participant_1 = user2_id AND participant_2 = user1_id);
    
    -- Если чат не существует, создаем новый
    IF chat_id IS NULL THEN
        INSERT INTO chats (participant_1, participant_2)
        VALUES (user1_id, user2_id)
        RETURNING id INTO chat_id;
    END IF;
    
    RETURN chat_id;
END;
$$ language 'plpgsql';

-- Комментарии к таблицам и полям
COMMENT ON TABLE chats IS 'Чаты между пользователями';
COMMENT ON TABLE messages IS 'Сообщения в чатах';

COMMENT ON COLUMN chats.participant_1 IS 'Первый участник чата';
COMMENT ON COLUMN chats.participant_2 IS 'Второй участник чата';
COMMENT ON COLUMN chats.last_message_at IS 'Время последнего сообщения';
COMMENT ON COLUMN chats.last_message_text IS 'Текст последнего сообщения';
COMMENT ON COLUMN chats.last_message_sender_id IS 'ID отправителя последнего сообщения';

COMMENT ON COLUMN messages.chat_id IS 'ID чата';
COMMENT ON COLUMN messages.sender_id IS 'ID отправителя сообщения';
COMMENT ON COLUMN messages.content IS 'Содержимое сообщения';
COMMENT ON COLUMN messages.message_type IS 'Тип сообщения (text, image, file)';
COMMENT ON COLUMN messages.is_read IS 'Прочитано ли сообщение';
