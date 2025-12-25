-- ÖNEMLİ: Bu script'i çalıştırmadan önce aşağıdaki bilgileri düzenleyin:
-- 1. E-posta adresinizi değiştirin
-- 2. Şifrenizi değiştirin (en az 6 karakter)

-- ADIM 1: Kullanıcı oluştur ve ID'yi al
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
    'admin@example.com', -- BURAYA KENDİ E-POSTANIZI YAZIN
    crypt('Admin123!', gen_salt('bf')), -- BURAYA KENDİ ŞİFRENİZİ YAZIN
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    NOW(),
    NOW(),
    false
  );
  
  -- auth.identities tablosuna ekle
  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    new_user_id,
    format('{"sub":"%s","email":"admin@example.com"}', new_user_id)::jsonb, -- E-POSTANIZI BURAYA DA YAZIN
    'email',
    NOW(),
    NOW(),
    NOW()
  );
  
  -- public.profiles tablosuna admin profili ekle
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    role,
    institution,
    created_at
  ) VALUES (
    new_user_id,
    'admin@example.com', -- E-POSTANIZI BURAYA DA YAZIN
    'Sistem Yöneticisi', -- İSTERSENİZ İSMİNİZİ YAZIN
    'admin',
    'Bilgi İşlem',
    NOW()
  );
  
  -- Başarı mesajı
  RAISE NOTICE 'Admin kullanıcısı başarıyla oluşturuldu! User ID: %', new_user_id;
END $$;
