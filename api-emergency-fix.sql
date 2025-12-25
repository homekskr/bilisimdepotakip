-- API EMERGENCY FIX & SCHEMA RE-EXPOSURE
-- Bu script, PostgREST API'sinin şemayı tanımasını engelleyen tüm engelleri kaldırır.

-- 1. ŞEMAYI SAHİPLEN VE İZİNLERİ TEMİZLE
-- Not: Bu komutlar en yetkili kullanıcı (postgres) ile çalıştırılmalıdır.
ALTER SCHEMA public OWNER TO postgres;

-- 2. TÜM ROL ERİŞİMLERİNİ YENİDEN TANIMLA
DO $$ 
BEGIN 
    -- Temel rollerin şemaya erişimi
    GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
    
    -- Varsayılan tablo izinleri
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, service_role;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO anon;
    
    -- Mevcut tüm tablolar için izinleri zorla
    PERFORM 'GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role';
    PERFORM 'GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated';
    PERFORM 'GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon';
    
    -- Arama yolunu (search_path) tüm kritik rollere zorla
    EXECUTE 'ALTER ROLE authenticator SET search_path TO public, auth, extensions';
    EXECUTE 'ALTER ROLE anon SET search_path TO public, extensions';
    EXECUTE 'ALTER ROLE authenticated SET search_path TO public, extensions';
    EXECUTE 'ALTER ROLE postgres SET search_path TO public, auth, extensions';
END $$;

-- 3. POSTGREST'İ YENİDEN BAŞLATMAYA ZORLA (SCHEMA RELOAD)
-- Bu komut Supabase altyapısına şemayı tekrar taramasını söyler.
NOTIFY pgrst, 'reload schema';

-- 4. TEST TABLOSU (Şema görünürlüğünü doğrulamak için)
CREATE TABLE IF NOT EXISTS public._schema_check (
    id int PRIMARY KEY DEFAULT 1,
    last_verified timestamp with time zone DEFAULT now()
);
GRANT SELECT ON public._schema_check TO anon, authenticated;
INSERT INTO public._schema_check (id) VALUES (1) ON CONFLICT (id) DO UPDATE SET last_verified = now();

RAISE NOTICE 'API Acil durum onarımı tamamlandı! Lütfen Supabase panelinde Settings > API kısmından bir kez Save yapın.';
