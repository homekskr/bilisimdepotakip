-- VERİTABANI DURUM KONTROLÜ (DİAGNOSTİK)
-- Hangi tabloların var olduğunu ve API'nin ne gördüğünü kontrol eder.

-- 1. Tabloları Listele
SELECT table_name, table_schema 
FROM information_schema.tables 
WHERE table_schema = 'public';

-- 2. RLS Durumunu Kontrol Et
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- 3. PostgREST (API) Görünürlük Testi
SELECT * FROM pg_catalog.pg_namespace WHERE nspname = 'public';

-- 4. Aktif Rolleri Kontrol Et
SELECT rolname FROM pg_roles WHERE rolname IN ('anon', 'authenticated', 'authenticator');
