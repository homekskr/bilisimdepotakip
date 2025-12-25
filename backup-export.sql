-- SUPABASE DATABASE BACKUP SCRIPT
-- Bu script'i Supabase SQL Editor'de çalıştırarak tüm verileri görebilirsiniz
-- Her sorguyu ayrı ayrı çalıştırıp sonuçları CSV olarak indirebilirsiniz

-- 1. MATERIALS TABLOSU
SELECT * FROM materials ORDER BY created_at;

-- 2. ASSIGNMENTS TABLOSU
SELECT * FROM assignments ORDER BY created_at;

-- 3. REQUESTS TABLOSU
SELECT * FROM requests ORDER BY created_at;

-- 4. PROFILES TABLOSU
SELECT * FROM profiles ORDER BY created_at;

-- 5. TABLO YAPILARINI GÖRMEK İÇİN
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- 6. TÜM TABLOLARI LİSTELE
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;
