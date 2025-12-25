-- DATABASE CLEANUP SCRIPT
-- Taşıma (migration) sürecinden kalan geçici tabloları temizler.

-- 1. ÖNCE ANALİZ (Opsiyonel)
-- Bu tabloların içindeki kayıt sayısına bakıp asıl tabloyla karşılaştırabilirsiniz.
-- SELECT count(*) FROM public.migration_profiles;
-- SELECT count(*) FROM public.profiles;

-- 2. TEMİZLİK
-- Eğer asıl 'profiles' ve 'requests' tablolarınızın doğru çalıştığından eminseniz
-- aşağıdaki tabloları silebilirsiniz:

BEGIN;

-- Geçici taşıma tabloları
DROP TABLE IF EXISTS public.migration_profiles;
DROP TABLE IF EXISTS public.migration_users;

-- Varsa diğer eski deneme tabloları
DROP TABLE IF EXISTS public.api_test;
DROP TABLE IF EXISTS public._schema_check;

COMMIT;

NOTIFY pgrst, 'reload schema';
