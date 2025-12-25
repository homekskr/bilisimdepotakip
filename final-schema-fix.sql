-- FINAL PERMISSION RESET & SCHEMA RECOVERY
-- PostgREST'in tüm şemalara erişimini ve yetkilerini en geniş şekilde sıfırlar.

-- 1. ŞEMA İZİNLERİ (auth ve public)
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA extensions TO anon, authenticated, service_role;

-- 2. TÜM TABLO İZİNLERİ (Açıkça belirtilerek)
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated, service_role;

-- 3. ROL YETKİLERİ (authenticator rolü kritik)
GRANT anon TO authenticator;
GRANT authenticated TO authenticator;
GRANT service_role TO authenticator;

-- 4. PATH VE CACHE
ALTER ROLE authenticator SET search_path TO public, auth, extensions;
NOTIFY pgrst, 'reload schema';

DO $$ 
BEGIN 
    RAISE NOTICE 'Son izin sıfırlama işlemi tamamlandı. Lütfen sayfayı yenileyin.';
END $$;
