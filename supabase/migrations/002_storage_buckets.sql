-- ============================================================================
-- Aethel: The Local Time Capsule - Supabase Storage Buckets & Policies
-- ============================================================================

-- 1. Create storage buckets for snapshots (photo/video up to 2-3 min) and audio map
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
    (
        'media-vault',
        'media-vault',
        true,
        104857600, -- 100 MB limit for photos & short videos (2-3 min)
        ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime']
    ),
    (
        'audio-map',
        'audio-map',
        true,
        20971520, -- 20 MB limit for ambient sounds & voice memories
        ARRAY['audio/mpeg', 'audio/wav', 'audio/webm', 'audio/ogg', 'audio/mp4']
    )
ON CONFLICT (id) DO NOTHING;

-- 2. Storage RLS Policies
-- Anyone (Guest or Registered) can view/stream media from buckets
DROP POLICY IF EXISTS "Public read access for media-vault" ON storage.objects;
CREATE POLICY "Public read access for media-vault"
    ON storage.objects FOR SELECT
    TO anon, authenticated
    USING (bucket_id = 'media-vault');

DROP POLICY IF EXISTS "Public read access for audio-map" ON storage.objects;
CREATE POLICY "Public read access for audio-map"
    ON storage.objects FOR SELECT
    TO anon, authenticated
    USING (bucket_id = 'audio-map');

-- Only authenticated users can upload files into their own folder (uid/*)
DROP POLICY IF EXISTS "Authenticated users can upload to media-vault" ON storage.objects;
CREATE POLICY "Authenticated users can upload to media-vault"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'media-vault'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

DROP POLICY IF EXISTS "Authenticated users can upload to audio-map" ON storage.objects;
CREATE POLICY "Authenticated users can upload to audio-map"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'audio-map'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

