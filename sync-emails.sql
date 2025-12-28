-- ==========================================
-- Email Senkronizasyon ve Özel Düzeltme
-- ==========================================

-- 1. Kazım kullanıcısı için özel düzeltme (kazima -> kazim)
-- Hem Auth tarafında hem Profil tarafında düzeltiyoruz
UPDATE auth.users 
SET email = 'kazim@ism.gov.tr' 
WHERE email = 'kazima@ism.gov.tr';

UPDATE public.profiles 
SET username = 'kazim@ism.gov.tr' 
WHERE username = 'kazima@ism.gov.tr';

-- 2. Mevcut profil e-postalarını Auth tablosuyla genel olarak eşitle
-- profiles tablosunda kolon ismi 'username' olduğu için onu kullanıyoruz
UPDATE public.profiles p
SET username = u.email
FROM auth.users u
WHERE p.id = u.id AND p.username <> u.email;

-- 3. Tüm e-postaları küçük harfe zorla
UPDATE auth.users SET email = LOWER(email);
UPDATE public.profiles SET username = LOWER(username);

-- 4. Otomatik Senkronizasyon İçin Trigger Oluştur
CREATE OR REPLACE FUNCTION public.handle_user_email_update()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles
  SET username = NEW.email
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger'ı ekle (Varsa önce sil)
DROP TRIGGER IF EXISTS on_auth_user_email_updated ON auth.users;
CREATE TRIGGER on_auth_user_email_updated
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_email_update();
