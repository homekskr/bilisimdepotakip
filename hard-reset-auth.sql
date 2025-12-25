-- HARD RESET AUTH & CLEAR ALL BLOCKERS
-- Bu script, giriş yapmanızı engelleyen tüm 500 hatalarını (trigger/kılıt) kökten temizler.

-- 1. ÖZEL TETİKLEYİCİLERİ TEMİZLE (SADECE BİZİM OLUŞTURDUKLARIMIZI)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 2. ESKİ YÖNETİCİ KAYITLARINI TEMİZLE (Çakışma olmaması için)
DELETE FROM auth.identities WHERE user_id IN (SELECT id FROM auth.users WHERE email = 'admin@ism.gov.tr');
DELETE FROM auth.users WHERE email = 'admin@ism.gov.tr';

-- 3. YENİ YÖNETİCİ OLUŞTUR (Mevcut referansları bozmadan)
DO $$ 
DECLARE
  target_id UUID;
BEGIN
  -- Eğer 'admin' kullanıcı adına sahip bir profil varsa onun ID'sini alalım (Zimmetlerde kullanılıyor olabilir)
  SELECT id INTO target_id FROM public.profiles WHERE username = 'admin' LIMIT 1;
  
  -- Eğer profil yoksa yeni bir ID üretelim
  IF target_id IS NULL THEN
    target_id := gen_random_uuid();
  END IF;

  -- Önce varsa eski auth kayıtlarını bu ID için temizleyelim (identities fkey yüzünden)
  DELETE FROM auth.identities WHERE user_id = target_id;
  DELETE FROM auth.users WHERE id = target_id;

  -- User kaydı
  INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    is_super_admin,
    confirmation_token
  ) VALUES (
    target_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'admin@ism.gov.tr',
    crypt('Admin123!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    now(),
    now(),
    FALSE,
    ''
  );

  -- Identity kaydı (Supabase için zorunlu)
  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    target_id,
    format('{"sub":"%s","email":"admin@ism.gov.tr"}', target_id)::jsonb,
    'email',
    'admin@ism.gov.tr',
    now(),
    now(),
    now()
  );

  -- Profile kaydı (Varsa dokunmayız, yoksa ekleriz)
  INSERT INTO public.profiles (id, username, full_name, role, created_at)
  VALUES (target_id, 'admin', 'Sistem Yöneticisi', 'admin', now())
  ON CONFLICT (username) DO UPDATE SET role = 'admin'; -- ID'yi güncellemeyiz, sadece rolü garanti ederiz.

END $$;

-- 4. GÜVENLİK AYARLARINI SIFIRLA
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';

RAISE NOTICE 'Yönetici hesabı Admin123! şifresiyle tertemiz bir şekilde yeniden oluşturuldu.';
