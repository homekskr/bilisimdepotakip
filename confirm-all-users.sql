-- CONFIRM ALL USERS
-- Tüm kullanıcıları veritabanı seviyesinde 'onaylanmış' olarak işaretler.
-- Bu sayede "Email not confirmed" hatası almadan giriş yapabilirler.

UPDATE auth.users 
SET email_confirmed_at = NOW(),
    last_sign_in_at = COALESCE(last_sign_in_at, NOW())
WHERE email_confirmed_at IS NULL;

-- Bilgilendirme
DO $$ 
BEGIN 
    RAISE NOTICE 'Tüm kullanıcılar başarıyla onaylandı. Şimdi giriş yapmayı deneyebilirsiniz.';
END $$;
