-- ============================================================================
-- Aethel: The Local Time Capsule - Initial Database Schema & RLS Policies
-- ============================================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------------
-- 1. ENUMS
-- ----------------------------------------------------------------------------
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('user', 'partner_guardian');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE media_type AS ENUM ('photo', 'video', 'audio');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ----------------------------------------------------------------------------
-- 2. USERS / PROFILES TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username VARCHAR(32) UNIQUE NOT NULL CHECK (char_length(username) >= 3 AND username ~ '^[a-zA-Z0-9_.-]+$'),
    role user_role NOT NULL DEFAULT 'user',
    partner_badge_label VARCHAR(80),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 3. LOCATIONS TABLE (Country -> City -> District)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    country VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL,
    district VARCHAR(120) NOT NULL,
    center_lat DOUBLE PRECISION,
    center_lng DOUBLE PRECISION,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (country, city, district)
);

-- ----------------------------------------------------------------------------
-- 4. VAULT SETTINGS (The Locked Vault & Timer)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vault_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE,
    vault_title VARCHAR(160) NOT NULL DEFAULT 'Головна Капсула Часу',
    description TEXT,
    unlock_at TIMESTAMPTZ NOT NULL,
    is_locked BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 5. MEDIA ITEMS (Daily Snapshots, Vault Media & Audio-Geotagging)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.media_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    author_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE RESTRICT,
    media_url TEXT NOT NULL,
    media_type media_type NOT NULL,
    captured_date DATE NOT NULL,
    caption TEXT,
    duration_seconds INTEGER CHECK (duration_seconds IS NULL OR duration_seconds <= 180),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    is_spotlight BOOLEAN NOT NULL DEFAULT FALSE,
    spotlight_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_media_items_location_date
    ON public.media_items (location_id, captured_date DESC);

CREATE INDEX IF NOT EXISTS idx_media_items_author
    ON public.media_items (author_id, created_at DESC);

-- ----------------------------------------------------------------------------
-- 6. FUTURE LETTERS (Листи в майбутнє)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.future_letters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    author_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE RESTRICT,
    title VARCHAR(160) NOT NULL,
    content TEXT NOT NULL,
    unlock_date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_future_letters_location_unlock
    ON public.future_letters (location_id, unlock_date ASC);

-- ----------------------------------------------------------------------------
-- 7. PUBLIC COMMENTS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    media_id UUID NOT NULL REFERENCES public.media_items(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL CHECK (char_length(trim(content)) > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_media
    ON public.comments (media_id, created_at ASC);

-- ----------------------------------------------------------------------------
-- 8. DIRECT MESSAGES (Приватні повідомлення)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.direct_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    media_reference_id UUID REFERENCES public.media_items(id) ON DELETE SET NULL,
    content TEXT NOT NULL CHECK (char_length(trim(content)) > 0),
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (sender_id <> receiver_id)
);

CREATE INDEX IF NOT EXISTS idx_direct_messages_participants
    ON public.direct_messages (sender_id, receiver_id, created_at ASC);

-- ----------------------------------------------------------------------------
-- 9. ROW LEVEL SECURITY (RLS) POLICIES
-- ----------------------------------------------------------------------------
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vault_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.future_letters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

-- Users: Only authenticated users can view user profiles (Guest cannot see nicknames!)
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.users;
CREATE POLICY "Authenticated users can view profiles"
    ON public.users FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;
CREATE POLICY "Users can insert their own profile"
    ON public.users FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
CREATE POLICY "Users can update their own profile"
    ON public.users FOR UPDATE
    TO authenticated
    USING (auth.uid() = id);

-- Locations: Anyone can read locations, authenticated users can add new districts
DROP POLICY IF EXISTS "Anyone can view locations" ON public.locations;
CREATE POLICY "Anyone can view locations"
    ON public.locations FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "Authenticated users can create locations" ON public.locations;
CREATE POLICY "Authenticated users can create locations"
    ON public.locations FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = created_by OR created_by IS NULL);

-- Vault settings: Anyone can view countdown timers
DROP POLICY IF EXISTS "Anyone can view vault settings" ON public.vault_settings;
CREATE POLICY "Anyone can view vault settings"
    ON public.vault_settings FOR SELECT
    TO anon, authenticated
    USING (true);

-- Media items: Anyone can view media items, only authenticated users can upload
DROP POLICY IF EXISTS "Anyone can view media items" ON public.media_items;
CREATE POLICY "Anyone can view media items"
    ON public.media_items FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "Authenticated users can upload media" ON public.media_items;
CREATE POLICY "Authenticated users can upload media"
    ON public.media_items FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "Authors can delete own media" ON public.media_items;
CREATE POLICY "Authors can delete own media"
    ON public.media_items FOR DELETE
    TO authenticated
    USING (auth.uid() = author_id);

-- Comments: Anyone can read comments, only authenticated users can post
DROP POLICY IF EXISTS "Anyone can read comments" ON public.comments;
CREATE POLICY "Anyone can read comments"
    ON public.comments FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "Authenticated users can post comments" ON public.comments;
CREATE POLICY "Authenticated users can post comments"
    ON public.comments FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = author_id);

-- Direct messages: Only sender or receiver can read/send
DROP POLICY IF EXISTS "Participants can view direct messages" ON public.direct_messages;
CREATE POLICY "Participants can view direct messages"
    ON public.direct_messages FOR SELECT
    TO authenticated
    USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS "Authenticated users can send direct messages" ON public.direct_messages;
CREATE POLICY "Authenticated users can send direct messages"
    ON public.direct_messages FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = sender_id);

-- ----------------------------------------------------------------------------
-- 10. SEED DATA (Default Locations & Vault Settings)
-- ----------------------------------------------------------------------------
INSERT INTO public.locations (country, city, district, center_lat, center_lng)
VALUES
    ('Україна', 'Київ', 'Поділ', 50.4688, 30.5161),
    ('Україна', 'Київ', 'Золоті Ворота', 50.4488, 30.5133),
    ('Україна', 'Львів', 'Площа Ринок', 49.8419, 24.0315),
    ('Україна', 'Львів', 'Кастелівка', 49.8295, 24.0110),
    ('Україна', 'Одеса', 'Приморський', 46.4825, 30.7233),
    ('Україна', 'Івано-Франківськ', 'Стометрівка', 48.9226, 24.7111)
ON CONFLICT (country, city, district) DO NOTHING;

INSERT INTO public.vault_settings (vault_title, description, unlock_at, is_locked)
VALUES (
    'Велика Капсула Часу Міста — 2030',
    'Спільний цифровий сейф спогадів, ранкових фото, голосів вулиць та листів у майбутнє.',
    '2030-01-01T00:00:00Z',
    TRUE
);

