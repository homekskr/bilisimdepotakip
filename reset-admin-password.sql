-- Mevcut admin kullanıcısının şifresini sıfırlama

-- Admin kullanıcısının ID'sini bulup şifresini değiştir
UPDATE auth.users
SET 
  encrypted_password = crypt('Admin123!', gen_salt('bf')), -- YENİ ŞİFRENİZİ BURAYA YAZIN
  email_confirmed_at = NOW(),
  updated_at = NOW()
WHERE id = (
  SELECT id FROM public.profiles WHERE username = 'admin' LIMIT 1
);

-- Başarı mesajı
DO $$
DECLARE
  admin_email text;
BEGIN
  SELECT email INTO admin_email 
  FROM auth.users 
  WHERE id = (SELECT id FROM public.profiles WHERE username = 'admin' LIMIT 1);
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Admin şifresi başarıyla sıfırlandı!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Email: %', admin_email;
  RAISE NOTICE 'Yeni Şifre: Admin123!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Artık uygulamaya giriş yapabilirsiniz!';
  RAISE NOTICE '========================================';
END $$;
