-- ==========================================
-- E-posta Onay Hatasını Düzeltme (Email not confirmed)
-- ==========================================

-- 1. Mevcut tüm kullanıcıları manuel olarak onaylanmış sayar
UPDATE auth.users 
SET email_confirmed_at = NOW() 
WHERE email_confirmed_at IS NULL;

-- 2. Ahmet@ism.gov.tr için özel olarak kontrol ve düzeltme
UPDATE auth.users 
SET email_confirmed_at = NOW(),
    last_sign_in_at = NULL -- İsteğe bağlı: temiz bir başlangıç için
WHERE email = 'ahmet@ism.gov.tr';

/* 
ÖNEMLİ TAVSİYE: 
Gelecekte bu hatayı tekrar almamak için Supabase Dashboard üzerinden:
Authentication -> Settings -> Email Auth -> "Confirm Email" 
seçeneğini KAPALI (OFF) konuma getirmeniz önerilir. 
Bu bir iç sistem olduğu için e-posta onayı süreci zorlaştırabilir.
*/
