-- Создание системы уведомлений
-- Этот скрипт нужно выполнить в Supabase Dashboard -> SQL Editor

-- ========================================
-- ЧАСТЬ 1: Создание таблицы уведомлений
-- ========================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'booking_request', 'booking_confirmed', 'booking_cancelled', etc.
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}', -- Дополнительные данные (booking_id, slot_id, etc.)
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- ЧАСТЬ 2: Создание индексов
-- ========================================

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);

-- ========================================
-- ЧАСТЬ 3: RLS политики для уведомлений
-- ========================================

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Удаляем существующие политики если есть
DROP POLICY IF EXISTS "Пользователи могут просматривать свои уведомления" ON public.notifications;
DROP POLICY IF EXISTS "Система может создавать уведомления" ON public.notifications;
DROP POLICY IF EXISTS "Пользователи могут обновлять свои уведомления" ON public.notifications;
DROP POLICY IF EXISTS "Пользователи могут удалять свои уведомления" ON public.notifications;

-- Создаем новые политики
CREATE POLICY "Пользователи могут просматривать свои уведомления" 
ON public.notifications FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Система может создавать уведомления" 
ON public.notifications FOR INSERT 
WITH CHECK (true); -- Позволяем создание уведомлений из триггеров

CREATE POLICY "Пользователи могут обновлять свои уведомления" 
ON public.notifications FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Пользователи могут удалять свои уведомления" 
ON public.notifications FOR DELETE 
USING (auth.uid() = user_id);

-- ========================================
-- ЧАСТЬ 4: Функция для создания уведомления
-- ========================================

CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id UUID,
  p_type VARCHAR(50),
  p_title VARCHAR(255),
  p_message TEXT,
  p_data JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES (p_user_id, p_type, p_title, p_message, p_data)
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- ЧАСТЬ 5: Функция для создания уведомления о бронировании
-- ========================================

CREATE OR REPLACE FUNCTION public.create_booking_notification()
RETURNS TRIGGER AS $$
DECLARE
  expert_id UUID;
  client_name TEXT;
  slot_info RECORD;
  notification_title TEXT;
  notification_message TEXT;
BEGIN
  -- Получаем информацию о слоте и эксперте
  SELECT 
    ts.expert_id,
    ts.slot_date,
    ts.start_time,
    ts.end_time,
    p.full_name
  INTO slot_info
  FROM public.time_slots ts
  LEFT JOIN public.profiles p ON NEW.user_id = p.id
  WHERE ts.id = NEW.slot_id;
  
  expert_id := slot_info.expert_id;
  client_name := COALESCE(slot_info.full_name, 'Пользователь');
  
  -- Создаем уведомление для эксперта
  IF NEW.status = 'pending' THEN
    notification_title := 'Новая заявка на бронирование';
    notification_message := client_name || ' запросил(а) бронирование на ' || 
                           TO_CHAR(slot_info.slot_date, 'DD.MM.YYYY') || ' с ' || 
                           slot_info.start_time::TEXT || ' до ' || slot_info.end_time::TEXT;
  ELSIF NEW.status = 'confirmed' THEN
    notification_title := 'Бронирование подтверждено';
    notification_message := 'Вы подтвердили бронирование с ' || client_name || ' на ' || 
                           TO_CHAR(slot_info.slot_date, 'DD.MM.YYYY') || ' с ' || 
                           slot_info.start_time::TEXT || ' до ' || slot_info.end_time::TEXT;
  ELSIF NEW.status = 'cancelled' THEN
    notification_title := 'Бронирование отменено';
    notification_message := 'Бронирование с ' || client_name || ' на ' || 
                           TO_CHAR(slot_info.slot_date, 'DD.MM.YYYY') || ' было отменено';
  END IF;
  
  -- Создаем уведомление
  IF expert_id IS NOT NULL AND notification_title IS NOT NULL THEN
    PERFORM public.create_notification(
      expert_id,
      'booking_' || NEW.status,
      notification_title,
      notification_message,
      jsonb_build_object(
        'booking_id', NEW.id,
        'slot_id', NEW.slot_id,
        'client_id', NEW.user_id,
        'client_name', client_name,
        'slot_date', slot_info.slot_date,
        'start_time', slot_info.start_time,
        'end_time', slot_info.end_time,
        'service', NEW.service,
        'notes', NEW.notes
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- ЧАСТЬ 6: Триггер для создания уведомлений при бронировании
-- ========================================

-- Удаляем старый триггер если есть
DROP TRIGGER IF EXISTS trigger_create_booking_notification ON public.bookings;

-- Создаем триггер для новых бронирований
CREATE TRIGGER trigger_create_booking_notification
  AFTER INSERT ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.create_booking_notification();

-- Создаем триггер для обновления статуса бронирований
CREATE TRIGGER trigger_update_booking_notification
  AFTER UPDATE OF status ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.create_booking_notification();

-- ========================================
-- ЧАСТЬ 7: Функции для подсчета непрочитанных уведомлений
-- ========================================

-- Функция с параметром user_id
CREATE OR REPLACE FUNCTION public.get_unread_notifications_count(p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  IF p_user_id IS NULL THEN
    RETURN 0;
  END IF;
  
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM public.notifications
    WHERE user_id = p_user_id AND is_read = FALSE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Функция для текущего пользователя
CREATE OR REPLACE FUNCTION public.get_unread_notifications_count_current()
RETURNS INTEGER AS $$
DECLARE
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN 0;
  END IF;
  
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM public.notifications
    WHERE user_id = current_user_id AND is_read = FALSE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- ЧАСТЬ 8: Функции для пометки уведомлений как прочитанных
-- ========================================

-- Функция для пометки конкретных уведомлений как прочитанных
CREATE OR REPLACE FUNCTION public.mark_notifications_as_read(
  p_notification_ids UUID[],
  p_user_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Помечаем конкретные уведомления как прочитанные
  UPDATE public.notifications
  SET is_read = TRUE, updated_at = NOW()
  WHERE user_id = p_user_id 
    AND id = ANY(p_notification_ids)
    AND is_read = FALSE;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Функция для пометки всех уведомлений пользователя как прочитанных
CREATE OR REPLACE FUNCTION public.mark_all_notifications_as_read(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Помечаем все уведомления пользователя как прочитанные
  UPDATE public.notifications
  SET is_read = TRUE, updated_at = NOW()
  WHERE user_id = p_user_id AND is_read = FALSE;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- ЧАСТЬ 9: Права доступа
-- ========================================

GRANT EXECUTE ON FUNCTION public.create_notification(UUID, VARCHAR(50), VARCHAR(255), TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_booking_notification() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_unread_notifications_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_unread_notifications_count_current() TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_notifications_as_read(UUID[], UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_all_notifications_as_read(UUID) TO authenticated;
