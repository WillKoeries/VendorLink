-- Supabase Storage Setup for VendorLink
-- Creates storage buckets and sets up Row Level Security (RLS) policies for image uploads.

-- 1. Create or update buckets for events and profiles
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    ('event-images', 'event-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/jpg']),
    ('profile-images', 'profile-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/jpg'])
ON CONFLICT (id) DO UPDATE SET 
    public = true,
    file_size_limit = 5242880,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Storage Objects Access Policies for event-images
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public read access for event-images'
    ) THEN
        CREATE POLICY "Public read access for event-images"
        ON storage.objects FOR SELECT
        USING (bucket_id = 'event-images');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public insert access for event-images'
    ) THEN
        CREATE POLICY "Public insert access for event-images"
        ON storage.objects FOR INSERT
        WITH CHECK (bucket_id = 'event-images');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public update access for event-images'
    ) THEN
        CREATE POLICY "Public update access for event-images"
        ON storage.objects FOR UPDATE
        USING (bucket_id = 'event-images')
        WITH CHECK (bucket_id = 'event-images');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public delete access for event-images'
    ) THEN
        CREATE POLICY "Public delete access for event-images"
        ON storage.objects FOR DELETE
        USING (bucket_id = 'event-images');
    END IF;
END $$;

-- 3. Storage Objects Access Policies for profile-images
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public read access for profile-images'
    ) THEN
        CREATE POLICY "Public read access for profile-images"
        ON storage.objects FOR SELECT
        USING (bucket_id = 'profile-images');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public insert access for profile-images'
    ) THEN
        CREATE POLICY "Public insert access for profile-images"
        ON storage.objects FOR INSERT
        WITH CHECK (bucket_id = 'profile-images');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public update access for profile-images'
    ) THEN
        CREATE POLICY "Public update access for profile-images"
        ON storage.objects FOR UPDATE
        USING (bucket_id = 'profile-images')
        WITH CHECK (bucket_id = 'profile-images');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public delete access for profile-images'
    ) THEN
        CREATE POLICY "Public delete access for profile-images"
        ON storage.objects FOR DELETE
        USING (bucket_id = 'profile-images');
    END IF;
END $$;
