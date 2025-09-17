# Руководство по отладке календаря занятий

## 🐛 Проблема: Забронированные слоты не отображаются красным

### 🔍 Что проверить

#### 1. Панель отладки (в режиме разработки)
При `NODE_ENV=development` в календаре появляется желтая панель отладки:
- ✅ **Всего слотов** - общее количество загруженных слотов
- ✅ **Доступных** - количество свободных слотов (`is_available: true`)
- ✅ **Недоступных** - количество забронированных слотов (`is_available: false`)
- ✅ **Бронирований** - количество активных бронирований

#### 2. Консоль браузера
Открыв DevTools → Console, вы увидите отладочные логи:
```
Загруженные слоты: [...]
Количество слотов: 10
Недоступные слоты: [...]
Загруженные бронирования: [...]
Количество бронирований: 2
Слот 09:00-10:00: доступен=true, бронирование=undefined
Слот 10:00-11:00: доступен=false, бронирование={client_name: "Иван"}
```

### 🔧 Возможные причины и решения

#### Причина 1: Нет тестовых данных
**Симптомы:**
- Все слоты показываются синими
- В панели отладки: "Недоступных: 0", "Бронирований: 0"

**Решение:**
1. **Создать расписание эксперта** в профиле
2. **Использовать кнопку "Создать тестовое бронирование"** в панели отладки
3. Или **забронировать слот** как обычный пользователь

#### Причина 2: Триггер не работает
**Симптомы:**
- Бронирования есть, но слоты остаются доступными
- В логах: `доступен=true` даже при наличии бронирования

**Проверка триггера:**
```sql
-- Проверить наличие триггера
SELECT * FROM pg_trigger WHERE tgname = 'update_slot_availability_trigger';

-- Проверить функцию
SELECT proname FROM pg_proc WHERE proname = 'update_slot_availability';
```

**Решение:**
```sql
-- Пересоздать триггер
DROP TRIGGER IF EXISTS update_slot_availability_trigger ON bookings;
CREATE TRIGGER update_slot_availability_trigger
    AFTER INSERT OR UPDATE OR DELETE ON bookings
    FOR EACH ROW EXECUTE FUNCTION update_slot_availability();
```

#### Причина 3: Неправильные RLS политики
**Симптомы:**
- Слоты не загружаются
- В консоли ошибки доступа

**Проверка политик:**
```sql
-- Проверить политики для time_slots
SELECT * FROM pg_policies WHERE tablename = 'time_slots';

-- Проверить политики для bookings
SELECT * FROM pg_policies WHERE tablename = 'bookings';
```

#### Причина 4: Неправильная связь данных
**Симптомы:**
- В логах: `бронирование=undefined` для всех слотов
- Слоты и бронирования не связываются

**Проверка связи:**
```sql
-- Проверить соответствие времени в слотах и бронированиях
SELECT 
    ts.start_time as slot_start,
    ts.end_time as slot_end,
    b.start_time as booking_start,
    b.end_time as booking_end,
    ts.is_available
FROM time_slots ts
LEFT JOIN bookings b ON b.slot_id = ts.id
WHERE ts.slot_date >= CURRENT_DATE
ORDER BY ts.slot_date, ts.start_time;
```

### 🧪 Тестирование системы

#### Шаг 1: Создание расписания
1. Войти как эксперт
2. Перейти в "Мой профиль"
3. Добавить расписание (например, Понедельник 09:00-18:00, 60 мин)
4. Проверить что генерируются слоты

#### Шаг 2: Тестовое бронирование
1. Открыть календарь эксперта
2. Нажать "Создать тестовое бронирование" в панели отладки
3. Проверить что слот стал красным

#### Шаг 3: Реальное бронирование
1. Войти как другой пользователь
2. Найти эксперта в поиске
3. Открыть его профиль
4. Забронировать доступный слот
5. Проверить что слот стал красным

### 📊 SQL запросы для диагностики

#### Проверка слотов:
```sql
SELECT 
    ts.id,
    ts.slot_date,
    ts.start_time,
    ts.end_time,
    ts.is_available,
    p.full_name as expert_name
FROM time_slots ts
LEFT JOIN profiles p ON p.id = ts.expert_id
WHERE ts.slot_date >= CURRENT_DATE
ORDER BY ts.slot_date, ts.start_time;
```

#### Проверка бронирований:
```sql
SELECT 
    b.id,
    b.booking_date,
    b.start_time,
    b.end_time,
    b.status,
    expert.full_name as expert_name,
    client.full_name as client_name
FROM bookings b
LEFT JOIN profiles expert ON expert.id = b.expert_id
LEFT JOIN profiles client ON client.id = b.client_id
WHERE b.booking_date >= CURRENT_DATE
ORDER BY b.booking_date, b.start_time;
```

#### Проверка связи слотов и бронирований:
```sql
SELECT 
    ts.slot_date,
    ts.start_time,
    ts.end_time,
    ts.is_available,
    CASE 
        WHEN b.id IS NOT NULL THEN 'Есть бронирование'
        ELSE 'Нет бронирования'
    END as booking_status,
    b.status as booking_status_detail,
    client.full_name as client_name
FROM time_slots ts
LEFT JOIN bookings b ON b.slot_id = ts.id AND b.status IN ('pending', 'confirmed')
LEFT JOIN profiles client ON client.id = b.client_id
WHERE ts.slot_date >= CURRENT_DATE
ORDER BY ts.slot_date, ts.start_time;
```

### 🎯 Ожидаемый результат

После успешной настройки:
- ✅ **Синие слоты** - доступны для бронирования
- ✅ **Красные слоты** - уже забронированы с именем клиента
- ✅ **Панель отладки** показывает корректные цифры
- ✅ **Консоль** показывает `доступен=false` для забронированных слотов

### 🔄 Автоматическое обновление

Система должна автоматически:
- ✅ **Генерировать слоты** при создании расписания
- ✅ **Помечать слоты недоступными** при бронировании
- ✅ **Освобождать слоты** при отмене бронирования
- ✅ **Обновлять UI** в реальном времени

Если что-то не работает, используйте панель отладки и консоль для диагностики! 🔧
