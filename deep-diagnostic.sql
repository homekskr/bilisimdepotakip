-- AUTH & SCHEMA DEEP DIAGNOSTIC
-- Bu script, 500 hatasının kaynağını bulmak için veritabanının röntgenini çeker.

-- 1. Tüm Tetikleyicileri (Trigger) Listele
-- Özellikle 'auth' şemasındakiler 500 hatasına neden olur.
SELECT 
    event_object_schema as "Schema",
    event_object_table as "Table",
    trigger_name as "Trigger Name",
    action_statement as "Action"
FROM information_schema.triggers 
WHERE event_object_schema IN ('auth', 'public')
ORDER BY 1, 2;

-- 2. 'handle_new_user' fonksiyonunu ayrıca kontrol et
SELECT routine_name, routine_definition 
FROM information_schema.routines 
WHERE routine_name = 'handle_new_user';

-- 3. 'auth.users' yapısını kontrol et (Sütun eksikliği var mı?)
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'auth' AND table_name = 'users';

-- 4. 'profiles' tablosundaki RLS durumunu teyit et
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'profiles';

-- 5. Hata Kaydı (Eğer veritabanı kendi içinde hata basıyorsa)
-- Bu genellikle boş gelir ama bakmakta fayda var.
SELECT * FROM pg_stat_activity WHERE state = 'active' AND query ILIKE '%auth%';
