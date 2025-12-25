-- ÇÖZÜM: Trigger'ı geçici olarak devre dışı bırakıp kullanıcı oluşturalım

-- ADIM 1: Trigger'ı devre dışı bırak
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- ADIM 2: Kullanıcı ve profil oluştur
DO $$
DECLARE
  new_user_id uuid;
BEGIN
  -- Yeni kullanıcı ID'si oluştur
  new_user_id := gen_random_uuid();
  
  -- auth.users tablosuna kullanıcı ekle
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
    new_user_id,
    'authenticated',
    'authenticated',
    'admin@ism.gov.tr', -- E-POSTANIZI KONTROL EDİN
    crypt('Admin123!', gen_salt('bf')), -- ŞİFRENİZİ KONTROL EDİN
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    NOW(),
    NOW(),
    false
  );
  
  -- auth.identities tablosuna ekle
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
    new_user_id::text,
    gen_random_uuid(),
    new_user_id,
    format('{"sub":"%s","email":"admin@ism.gov.tr"}', new_user_id)::jsonb,
    'email',
    NOW(),
    NOW(),
    NOW()
  );
  
  -- public.profiles tablosuna admin profili ekle
  INSERT INTO public.profiles (
    id,
    full_name,
    role,
    institution,
    created_at
  ) VALUES (
    new_user_id,
    'Sistem Yöneticisi',
    'admin',
    'Bilgi İşlem',
    NOW()
  );
  
  -- Başarı mesajı
  RAISE NOTICE 'Admin kullanıcısı başarıyla oluşturuldu!';
  RAISE NOTICE 'User ID: %', new_user_id;
  RAISE NOTICE 'Email: admin@ism.gov.tr';
  RAISE NOTICE 'Password: Admin123!';
END $$;

-- ADIM 3: Trigger'ı yeniden oluştur (düzeltilmiş hali)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, institution)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', 'Yeni Kullanıcı'),
    COALESCE(new.raw_user_meta_data->>'role', 'personel'),
    COALESCE(new.raw_user_meta_data->>'institution', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

-- Trigger'ı tekrar aktif et
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- TAMAMLANDI!
-- Artık Supabase Dashboard > Authentication > Users bölümünden
-- normal şekilde kullanıcı oluşturabilirsiniz.
