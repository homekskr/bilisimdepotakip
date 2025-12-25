-- MEVCUT PROFİLİ AUTH SİSTEMİNE BAĞLAMA
-- Bu script, 'profiles' tablosundaki 'admin' kullanıcısını Supabase Auth sistemine kaydeder.

-- ÖNEMLİ: Aşağıdaki bilgileri düzenleyin:
-- 1. E-posta adresinizi yazın (admin@ism.gov.tr gibi)
-- 2. Bildiğiniz şifreyi yazın

DO $$
DECLARE
  target_id uuid := 'fd56cd29-b01f-49e6-a2de-07dff61d5492'; -- Profiles tablosundaki admin ID'si
  target_email text := 'admin@ism.gov.tr'; -- BURAYA ADMIN E-POSTASINI YAZIN
  target_password text := 'ŞİFRENİZİ_BURAYA_YAZIN'; -- BURAYA BİLDİĞİNİZ ŞİFREYİ YAZIN
BEGIN
  -- 0. Mevcut hatalı trigger'ı devre dışı bırak (email sütunu hatasını önlemek için)
  DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

  -- 1. auth.users tablosuna ekle
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    is_super_admin
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    target_id,
    'authenticated',
    'authenticated',
    target_email,
    crypt(target_password, gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    NOW(),
    NOW(),
    false
  ) ON CONFLICT (id) DO NOTHING;

  -- 2. auth.identities tablosuna ekle
  -- Not: Bazı Supabase sürümlerinde provider_id zorunludur
  INSERT INTO auth.identities (
    provider_id,
    id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    target_id::text,
    gen_random_uuid(),
    target_id,
    format('{"sub":"%s","email":"%s"}', target_id, target_email)::jsonb,
    'email',
    NOW(),
    NOW(),
    NOW()
  ) ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Admin profili başarıyla Auth sistemine bağlandı!';
END $$;

-- 3. Trigger Fonksiyonunu Gerçek Tablo Yapısına Göre Düzelt (Email sütunu olmadan)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'full_name', 'Yeni Kullanıcı'),
    COALESCE(new.raw_user_meta_data->>'role', 'personel')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

-- 4. Trigger'ı tekrar aktif et
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
