-- 1. Giden İstek Kuyruğu (Son 10 Kayıt)
-- Eğer burada kayıt varsa tetikleyici çalışıyor demektir.
SELECT * FROM net.http_request_queue ORDER BY id DESC LIMIT 10;

-- 2. Dışarıdan Dönen Cevaplar (Hatalar)
-- Eğer Vercel hata veriyorsa burada 'error' veya 401/500 kodu görürüz.
SELECT * FROM net._http_response ORDER BY id DESC LIMIT 10;

-- 3. Yönetici Telefonlarını Kontrol Et
-- SMS gidecek yöneticilerin telefonları nasıl kayıtlı?
SELECT email, full_name, role, phone 
FROM public.profiles 
WHERE role IN ('yonetici', 'baskan', 'admin');
