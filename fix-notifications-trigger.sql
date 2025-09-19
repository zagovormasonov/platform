-- Исправление триггера уведомлений для бронирований
-- Проблема: используется NEW.user_id вместо NEW.client_id

-- 1. Удаляем старую функцию триггера
DROP FUNCTION IF EXISTS public.create_booking_notification() CASCADE;

-- 2. Создаем исправленную функцию триггера
CREATE OR REPLACE FUNCTION public.create_booking_notification()
RETURNS TRIGGER AS $$
DECLARE
  expert_id UUID;
  slot_info RECORD;
  client_name TEXT;
  notification_title TEXT;
  notification_message TEXT;
BEGIN
  -- Получаем информацию о слоте и клиенте
  SELECT 
    ts.expert_id,
    ts.slot_date,
    ts.start_time,
    ts.end_time,
    p.full_name
  INTO slot_info
  FROM public.time_slots ts
  LEFT JOIN public.profiles p ON NEW.client_id = p.id  -- ИСПРАВЛЕНО: client_id вместо user_id
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
        'client_id', NEW.client_id,  -- ИСПРАВЛЕНО: client_id вместо user_id
        'client_name', client_name,
        'slot_date', slot_info.slot_date,
        'start_time', slot_info.start_time,
        'end_time', slot_info.end_time,
        'service_id', NEW.service_id,
        'notes', NEW.notes
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Пересоздаем триггер
DROP TRIGGER IF EXISTS create_booking_notification_trigger ON public.bookings;

CREATE TRIGGER create_booking_notification_trigger
  AFTER INSERT OR UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.create_booking_notification();

-- 4. Устанавливаем права доступа
GRANT EXECUTE ON FUNCTION public.create_booking_notification() TO authenticated;
