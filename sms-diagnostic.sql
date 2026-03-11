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

-- 5. Requests Tablosu Gerçek Sütun İsimleri
-- Hangi sütunların olduğunu kesin olarak görelim.
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'requests';
