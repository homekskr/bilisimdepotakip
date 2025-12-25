-- PERMISSION & SEARCH PATH FIX (THE ULTIMATE FIX)
-- "Database error querying schema" hatasını çözmek için rolleri ve arama yolunu hedefler.

-- 1. ROLLERE ŞEMA KULLANIM İZNİ VER
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA public TO postgres;

-- 2. TÜM TABLOLARA VE DİZİLERE TAM YETKİ VER
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

-- 3. VARSAYILAN İZİNLERİ AYARLA (Gelecekteki tablolar için)
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;

-- 4. SEARCH PATH AYARI (PostgREST'in tabloları bulabilmesi için kritik)
-- Bu komut PostgREST'in (API) hangi şemalara bakacağını belirler.
ALTER ROLE authenticator SET search_path TO public, auth, extensions;
ALTER ROLE anon SET search_path TO public, extensions;
ALTER ROLE authenticated SET search_path TO public, extensions;

-- 5. RLS'Yİ TEST İÇİN TAMAMEN KAPAT (Hata gidene kadar)
-- Eğer hata giderse, tek tek güvenli politikaları geri ekleyeceğiz.
ALTER TABLE IF EXISTS public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.materials DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.assignments DISABLE ROW LEVEL SECURITY;

-- 6. SCHEMA CACHE RELOAD
NOTIFY pgrst, 'reload schema';

DO $$ BEGIN
    RAISE NOTICE 'İzinler ve arama yolu başarıyla güncellendi. Lütfen sayfayı yenileyip tekrar deneyin.';
END $$;
