-- ANALYZE PROFILES AND RELATIONSHIPS
-- Bu script, profiles tablosundaki kayıtların hangi verilere bağlı olduğunu gösterir.

-- 1. Kaç profil var ve kimler?
SELECT role, count(*) 
FROM public.profiles 
GROUP BY role;

-- 2. Zimmetlerde (assignments) kullanılan ama auth tarafında olmayan id'ler var mı?
SELECT count(*) as "Zimmetli Profil Sayısı"
FROM public.profiles 
WHERE id IN (SELECT assigned_to FROM public.assignments OR id IN (SELECT assigned_by FROM public.assignments));

-- 3. Taleplerde kullanılan profil sayısı
SELECT count(*) as "Talepli Profil Sayısı"
FROM public.profiles 
WHERE id IN (SELECT requested_by FROM public.requests);
