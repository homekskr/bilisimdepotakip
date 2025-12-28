-- ==========================================
-- Email Senkronizasyon ve Otomatik Güncelleme
-- ==========================================

-- 1. Mevcut profil e-postalarını Auth tablosuyla eşitle
-- Auth tablosunu kaynak (source of truth) kabul ediyoruz
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND p.email <> u.email;

-- 2. Tüm e-postaları küçük harfe zorla (Opsiyonel ama önerilir)
UPDATE auth.users SET email = LOWER(email);
UPDATE public.profiles SET email = LOWER(email);

-- 3. Otomatik Senkronizasyon İçin Trigger Oluştur
-- Bu sayede Auth tablosunda bir e-posta değiştiğinde Profil tablosu da güncellenir

CREATE OR REPLACE FUNCTION public.handle_user_email_update()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles
  SET email = NEW.email
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

-- 4. Kazım kullanıcısı için özel kontrol (Eğer e-postası auth tarafında yanlışsa düzeltmek için)
-- NOT: buradaki 'ID_BURAYA' kısmını kullanıcının gerçek ID'si ile değiştirmeniz gerekebilir
-- Veya sadece auth tarafındaki e-postayı düzeltmek isterseniz:
-- UPDATE auth.users SET email = 'kazim@ism.gov.tr' WHERE email = 'kazima@ism.gov.tr';
