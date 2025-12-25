-- AUTH FINAL VERIFICATION
-- Bu script, auth sistemindeki kayıtların doğruluğunu ve eksikliklerini kontrol eder.

-- 1. Kullanıcıyı bul
SELECT id, email, email_confirmed_at, created_at, last_sign_in_at 
FROM auth.users 
WHERE email = 'admin@ism.gov.tr' OR email = 'admin@example.com';

-- 2. Kimlik (Identity) kaydını kontrol et (En sık 500 hata sebebi budur)
SELECT id, user_id, provider, provider_id, identity_data->>'email' as identity_email
FROM auth.identities 
WHERE user_id IN (SELECT id FROM auth.users WHERE email = 'admin@ism.gov.tr' OR email = 'admin@example.com');

-- 3. Profil kaydını kontrol et
SELECT id, username, role 
FROM public.profiles 
WHERE id IN (SELECT id FROM auth.users WHERE email = 'admin@ism.gov.tr' OR email = 'admin@example.com');

-- 4. Supabase'in "kendi" gizli tetikleyicilerini kontrol et (Bunlar silinmemeli ama görünmeli)
SELECT tgname, tgrelid::regclass, tgenabled 
FROM pg_trigger 
WHERE tgname LIKE 'RI_ConstraintTrigger%' AND tgrelid IN ('auth.users'::regclass, 'auth.identities'::regclass);
