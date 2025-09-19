-- Улучшенный триггер уведомлений для бронирований
-- Создает уведомления и для экспертов, и для клиентов

-- 1. Удаляем старую функцию триггера
DROP FUNCTION IF EXISTS public.create_booking_notification() CASCADE;

-- 2. Создаем улучшенную функцию триггера
CREATE OR REPLACE FUNCTION public.create_booking_notification()
RETURNS TRIGGER AS $$
DECLARE
  expert_id UUID;
  slot_info RECORD;
  client_name TEXT;
  expert_name TEXT;
  notification_title TEXT;
  notification_message TEXT;
  expert_notification_title TEXT;
  expert_notification_message TEXT;
  client_notification_title TEXT;
  client_notification_message TEXT;
BEGIN
  -- Получаем информацию о слоте, клиенте и эксперте
  SELECT 
    ts.expert_id,
    ts.slot_date,
    ts.start_time,
    ts.end_time,
    client_p.full_name as client_full_name,
    expert_p.full_name as expert_full_name
  INTO slot_info
  FROM public.time_slots ts
  LEFT JOIN public.profiles client_p ON NEW.client_id = client_p.id
  LEFT JOIN public.profiles expert_p ON ts.expert_id = expert_p.id
  WHERE ts.id = NEW.slot_id;
  
  expert_id := slot_info.expert_id;
  client_name := COALESCE(slot_info.client_full_name, 'Пользователь');
  expert_name := COALESCE(slot_info.expert_full_name, 'Эксперт');
  
  -- Только для новых записей (INSERT) или изменения статуса
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status != NEW.status) THEN
    
    -- Создаем уведомления в зависимости от статуса
    IF NEW.status = 'pending' THEN
      -- Уведомление для эксперта о новой заявке
      expert_notification_title := 'Новая заявка на бронирование';
      expert_notification_message := client_name || ' запросил(а) бронирование на ' || 
                                   TO_CHAR(slot_info.slot_date, 'DD.MM.YYYY') || ' с ' || 
                                   slot_info.start_time::TEXT || ' до ' || slot_info.end_time::TEXT;
      
      -- Создаем уведомление для эксперта
      PERFORM public.create_notification(
        expert_id,
        'booking_pending',
        expert_notification_title,
        expert_notification_message,
        jsonb_build_object(
          'booking_id', NEW.id,
          'slot_id', NEW.slot_id,
          'client_id', NEW.client_id,
          'client_name', client_name,
          'slot_date', slot_info.slot_date,
          'start_time', slot_info.start_time,
          'end_time', slot_info.end_time,
          'service_id', NEW.service_id,
          'notes', NEW.notes
        )
      );
      
    ELSIF NEW.status = 'confirmed' THEN
      -- Уведомление для клиента о подтверждении
      client_notification_title := 'Бронирование подтверждено';
      client_notification_message := expert_name || ' подтвердил(а) ваше бронирование на ' || 
                                    TO_CHAR(slot_info.slot_date, 'DD.MM.YYYY') || ' с ' || 
                                    slot_info.start_time::TEXT || ' до ' || slot_info.end_time::TEXT;
      
      -- Создаем уведомление для клиента
      PERFORM public.create_notification(
        NEW.client_id,
        'booking_confirmed_client',
        client_notification_title,
        client_notification_message,
        jsonb_build_object(
          'booking_id', NEW.id,
          'slot_id', NEW.slot_id,
          'expert_id', expert_id,
          'expert_name', expert_name,
          'slot_date', slot_info.slot_date,
          'start_time', slot_info.start_time,
          'end_time', slot_info.end_time,
          'service_id', NEW.service_id,
          'notes', NEW.notes
        )
      );
      
    ELSIF NEW.status = 'cancelled' THEN
      -- Уведомление для клиента об отмене
      client_notification_title := 'Бронирование отменено';
      client_notification_message := expert_name || ' отменил(а) ваше бронирование на ' || 
                                    TO_CHAR(slot_info.slot_date, 'DD.MM.YYYY') || ' с ' || 
                                    slot_info.start_time::TEXT || ' до ' || slot_info.end_time::TEXT;
      
      -- Создаем уведомление для клиента
      PERFORM public.create_notification(
        NEW.client_id,
        'booking_cancelled_client',
        client_notification_title,
        client_notification_message,
        jsonb_build_object(
          'booking_id', NEW.id,
          'slot_id', NEW.slot_id,
          'expert_id', expert_id,
          'expert_name', expert_name,
          'slot_date', slot_info.slot_date,
          'start_time', slot_info.start_time,
          'end_time', slot_info.end_time,
          'service_id', NEW.service_id,
          'notes', NEW.notes
        )
      );
    END IF;
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
