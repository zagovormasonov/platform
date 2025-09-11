# Исправление SQL скрипта

## Проблема
Ошибка `syntax error at or near "ADD"` возникала из-за неправильного синтаксиса PostgreSQL.

## Исправления

### 1. Добавление полей в таблицу profiles
**Было:**
```sql
ALTER TABLE profiles 
ADD COLUMN user_type TEXT DEFAULT 'user' CHECK (user_type IN ('user', 'expert')),
ADD COLUMN phone TEXT,
-- ...
```

**Стало:**
```sql
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'user_type') THEN
        ALTER TABLE profiles ADD COLUMN user_type TEXT DEFAULT 'user' CHECK (user_type IN ('user', 'expert'));
    END IF;
END $$;
```

### 2. Создание таблиц
**Было:**
```sql
CREATE TABLE categories (
```

**Стало:**
```sql
CREATE TABLE IF NOT EXISTS categories (
```

### 3. Вставка категорий
**Было:**
```sql
INSERT INTO categories (name, description) VALUES
('Регресс', 'Работа с прошлыми жизнями и травмами'),
-- ...
('Кинезиология', 'Наука о движении и мышечном тестировании');
```

**Стало:**
```sql
INSERT INTO categories (name, description) VALUES
('Регресс', 'Работа с прошлыми жизнями и травмами'),
-- ...
('Кинезиология', 'Наука о движении и мышечном тестировании')
ON CONFLICT (name) DO NOTHING;
```

### 4. Политики RLS
**Было:**
```sql
CREATE POLICY "Anyone can view categories" ON categories
```

**Стало:**
```sql
DROP POLICY IF EXISTS "Anyone can view categories" ON categories;
CREATE POLICY "Anyone can view categories" ON categories
```

### 5. Триггеры
**Было:**
```sql
CREATE TRIGGER update_expert_rating_on_review_insert
```

**Стало:**
```sql
DROP TRIGGER IF EXISTS update_expert_rating_on_review_insert ON reviews;
CREATE TRIGGER update_expert_rating_on_review_insert
```

## Результат
Теперь SQL скрипт можно выполнять многократно без ошибок. Все операции проверяют существование объектов перед их созданием.

## Инструкция по выполнению
1. Откройте SQL Editor в вашем проекте Supabase
2. Скопируйте и вставьте весь исправленный скрипт `supabase-update.sql`
3. Нажмите "Run" для выполнения
4. Проверьте, что все таблицы и политики созданы успешно

Скрипт теперь безопасен для повторного выполнения!
