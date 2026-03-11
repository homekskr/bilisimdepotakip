-- ==========================================
-- SMS SORUN GİDERME VE TEŞHİS SORGULARI
-- ==========================================

-- 1. pg_net Eklentisi Kurulu mu?
-- Bu sorgu 'active' dönmelidir.
SELECT * FROM pg_extension WHERE extname = 'pg_net';

-- 2. Kuyruktaki İstekleri Gör (Ham Veri)
-- Eğer tablo boşsa, tetikleyici (trigger) çalışmıyor demeli.
-- Eğer doluysa, istekler Vercel'e gitmeye çalışıyor demektir.
SELECT * FROM net.http_request_queue LIMIT 10;

-- 2b. Hata Kayıtlarını Gör (Eğer varsa)
-- pg_net sürümüne göre bu tablo ismi değişebilir.
SELECT * FROM net._http_response LIMIT 10;

-- 3. Yetkili Kullanıcıların Telefon Numaralarını Kontrol Et
-- SMS gidecek kişilerin telefonu kayıtlı mı?
-- (Admin, Yönetici ve Başkan rolleri)
SELECT email, full_name, role, phone 
FROM public.profiles 
WHERE role IN ('admin', 'yonetici', 'baskan');

-- 4. Telefon Numarası Formatı Doğru mu?
-- Örnek doğru format: 905321112233
SELECT email, phone 
FROM public.profiles 
WHERE phone IS NOT NULL 
AND (length(phone) <> 12 OR phone NOT LIKE '90%');
