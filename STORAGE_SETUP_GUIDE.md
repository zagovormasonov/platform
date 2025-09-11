# Настройка Supabase Storage для аватаров

## 🚨 Проблема с SQL скриптом

Ошибка `ERROR: 42501: must be owner of table objects` возникает потому, что обычные пользователи не могут создавать политики для системных таблиц Supabase.

## ✅ Решение: Настройка через веб-интерфейс

### **Шаг 1: Выполните SQL скрипт (частично)**
```sql
-- Создание bucket для аватаров (если еще не существует)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;
```

### **Шаг 2: Настройка политик через веб-интерфейс**

1. **Откройте панель Supabase:**
   - Перейдите в ваш проект Supabase
   - В левом меню выберите **"Storage"**

2. **Найдите bucket "avatars":**
   - Если bucket не создался, создайте его вручную
   - Нажмите **"New bucket"**
   - Название: `avatars`
   - Public: ✅ **Включено**

3. **Настройте политики безопасности:**
   - Нажмите на bucket **"avatars"**
   - Перейдите во вкладку **"Policies"**
   - Нажмите **"New Policy"**

### **Политики для добавления:**

#### **1. SELECT Policy (Просмотр аватаров)**
- **Name:** `Anyone can view avatars`
- **Policy:** `bucket_id = 'avatars'`
- **Description:** `Allow anyone to view avatar images`

#### **2. INSERT Policy (Загрузка аватаров)**
- **Name:** `Authenticated users can upload avatars`
- **Policy:** `bucket_id = 'avatars' AND auth.role() = 'authenticated'`
- **Description:** `Allow authenticated users to upload avatar images`

#### **3. UPDATE Policy (Обновление аватаров)**
- **Name:** `Users can update their own avatars`
- **Policy:** `bucket_id = 'avatars' AND auth.role() = 'authenticated' AND auth.uid()::text = (storage.filename(name))`
- **Description:** `Allow users to update their own avatar images`

#### **4. DELETE Policy (Удаление аватаров)**
- **Name:** `Users can delete their own avatars`
- **Policy:** `bucket_id = 'avatars' AND auth.role() = 'authenticated' AND auth.uid()::text = (storage.filename(name))`
- **Description:** `Allow users to delete their own avatar images`

## 🔧 Альтернативный способ (через SQL с правами суперпользователя)

Если у вас есть доступ к суперпользователю Supabase, можете выполнить полный SQL скрипт:

```sql
-- Создание bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Политики (только для суперпользователя)
CREATE POLICY "Anyone can view avatars" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Authenticated users can upload avatars" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their own avatars" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'avatars' 
  AND auth.role() = 'authenticated'
  AND auth.uid()::text = (storage.filename(name))
);

CREATE POLICY "Users can delete their own avatars" ON storage.objects
FOR DELETE USING (
  bucket_id = 'avatars' 
  AND auth.role() = 'authenticated'
  AND auth.uid()::text = (storage.filename(name))
);
```

## ✅ Проверка настройки

После настройки политик:

1. **Попробуйте загрузить аватар** в профиле пользователя
2. **Проверьте, что файл появился** в bucket "avatars"
3. **Убедитесь, что изображение отображается** в профиле

## 🎯 Результат

После правильной настройки:
- ✅ Пользователи могут загружать аватары
- ✅ Аватары доступны для просмотра всем
- ✅ Пользователи могут обновлять только свои аватары
- ✅ Безопасность данных обеспечена

**Рекомендуется использовать веб-интерфейс Supabase для настройки политик Storage!** 🚀
