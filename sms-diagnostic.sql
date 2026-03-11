-- 1. En Son Alınan Cevaplar (Hata Detayları)
-- Şifre güncellemesinden sonraki sonuçları görmek için:
SELECT id, status_code, content FROM net._http_response ORDER BY id DESC LIMIT 10;

-- 2. Yönetici Telefon Formatlarını Kontrol Et
-- Örn: 5321329079 (10 hane) vs 905321329079 (12 hane)
SELECT full_name, role, phone 
FROM public.profiles 
WHERE role IN ('yonetici', 'baskan', 'admin');

-- 3. Yönetici Telefonlarını Kontrol Et
-- SMS gidecek yöneticilerin telefonları nasıl kayıtlı?
SELECT email, full_name, role, phone 
FROM public.profiles 
WHERE role IN ('yonetici', 'baskan', 'admin');
