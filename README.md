# Платформа духовного опыта

Онлайн-ресурс для обмена духовным опытом, где участники сообщества могут делиться своими знаниями, опытом, открытиями и инсайтами.

## Технологии

- **React 18** - современный UI фреймворк
- **TypeScript** - типизированный JavaScript
- **Vite** - быстрый сборщик и dev-сервер
- **Tailwind CSS** - utility-first CSS фреймворк
- **Supabase** - backend-as-a-service для аутентификации и базы данных
- **React Router** - маршрутизация
- **Lucide React** - современные иконки

## Функциональность

- ✅ Регистрация и авторизация пользователей
- ✅ Личный кабинет пользователя
- ✅ Создание и редактирование статей
- ✅ Публикация статей (черновики/опубликованные)
- ✅ Удаление статей
- ✅ Лента опубликованных статей всех пользователей
- ✅ Редактирование профиля пользователя
- ✅ Навигация между разделами
- ✅ Современный и отзывчивый UI
- ✅ Защищенные маршруты

## Быстрый старт

### 1. Установка зависимостей

```bash
npm install
```

### 2. Настройка Supabase

1. Создайте проект на [supabase.com](https://supabase.com)
2. Перейдите в раздел "SQL Editor" и выполните следующие SQL команды:

```sql
-- Создание таблицы профилей
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создание таблицы статей
CREATE TABLE articles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Включение RLS (Row Level Security)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;

-- Политики для профилей
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Политики для статей
CREATE POLICY "Users can view published articles" ON articles
  FOR SELECT USING (published = true);

CREATE POLICY "Users can view own articles" ON articles
  FOR SELECT USING (auth.uid() = author_id);

CREATE POLICY "Users can insert own articles" ON articles
  FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update own articles" ON articles
  FOR UPDATE USING (auth.uid() = author_id);

CREATE POLICY "Users can delete own articles" ON articles
  FOR DELETE USING (auth.uid() = author_id);

-- Функция для автоматического создания профиля
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Триггер для автоматического создания профиля
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

3. Перейдите в раздел "Settings" → "API" и скопируйте:
   - Project URL
   - anon public key

### 3. Настройка переменных окружения

Создайте файл `.env` в корне проекта:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Запуск проекта

```bash
npm run dev
```

Откройте [http://localhost:3000](http://localhost:3000) в браузере.

## Структура проекта

```
src/
├── components/          # React компоненты
│   ├── AuthForm.tsx     # Форма авторизации/регистрации
│   ├── Dashboard.tsx    # Личный кабинет
│   ├── Feed.tsx         # Лента опубликованных статей
│   ├── ArticleForm.tsx  # Форма создания/редактирования статей
│   ├── ProfileForm.tsx  # Форма редактирования профиля
│   ├── Navigation.tsx   # Навигация между разделами
│   └── ProtectedRoute.tsx # Компонент защищенных маршрутов
├── contexts/            # React контексты
│   └── AuthContext.tsx  # Контекст аутентификации
├── lib/                # Утилиты и конфигурация
│   └── supabase.ts     # Конфигурация Supabase
├── App.tsx             # Главный компонент приложения
├── main.tsx            # Точка входа
└── index.css           # Глобальные стили
```

## Скрипты

- `npm run dev` - запуск dev-сервера
- `npm run build` - сборка для продакшена
- `npm run preview` - предварительный просмотр сборки
- `npm run lint` - проверка кода линтером

## Особенности

- **Адаптивный дизайн** - работает на всех устройствах
- **Типизация** - полная поддержка TypeScript
- **Безопасность** - Row Level Security в Supabase
- **Современный UI** - использование Tailwind CSS и Lucide иконок
- **Удобство использования** - интуитивный интерфейс

## Лицензия

MIT
