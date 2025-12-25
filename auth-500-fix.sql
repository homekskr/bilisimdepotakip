-- AUTH & TRIGGER EMERGENCY CLEANUP
-- Giriş sırasındaki 500 hatasını çözmek için triggerları ve RLS'yi geçici olarak tamamen temizler.

-- 1. TRIGGERLARI KALDIR (Giriş işlemini engelliyor olabilirler)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 2. RLS'YI TAMAMEN KAPAT (Hata kaynağını izole etmek için)
ALTER TABLE IF EXISTS public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.materials DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.requests DISABLE ROW LEVEL SECURITY;

-- 3. AUTH IDENTITIES KONTROLÜ
-- Bazı durumlarda auth.identities tablosundaki eksiklik 500 hatasına yol açar.
-- Admin kullanıcısının identity kaydı var mı diye bakacağız (Siz çalıştırınca sonuçlara bakın)
SELECT * FROM auth.identities WHERE user_id IN (SELECT id FROM auth.users WHERE email = 'admin@example.com' OR email = 'admin@ism.gov.tr');

-- 4. LOGIN'I ENGELLEYEBILECEK DIGER UNSURLAR
-- Eğer daha önce "link-admin-profile" çalıştırıldıysa, şifre hash'i yanlış oluşmuş olabilir.
-- Bu komut admin şifresini "Admin123!" olarak en güvenli yöntemle resetler.
UPDATE auth.users 
SET encrypted_password = crypt('Admin123!', gen_salt('bf')),
    email_confirmed_at = now(),
    last_sign_in_at = NULL
WHERE email = 'admin@example.com' OR email = 'admin@ism.gov.tr';

NOTIFY pgrst, 'reload schema';

DO $$ 
BEGIN 
    RAISE NOTICE 'Triggerlar kaldırıldı ve RLS kapatıldı. Lütfen şimdi giriş yapmayı deneyin (Şifre: Admin123!).';
END $$;
