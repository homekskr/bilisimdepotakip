-- ==========================================
-- Mevcut Kullanıcı E-postalarını Küçük Harfe Çevir
-- ==========================================

-- 1. Profiles tablosundaki username'leri küçük harfe çevir
UPDATE profiles
SET username = LOWER(username)
WHERE username != LOWER(username);

-- 2. Auth.users tablosundaki email'leri küçük harfe çevir (Supabase Dashboard'da çalıştırın)
-- NOT: Bu sorgu auth.users tablosuna erişim gerektirir, sadece Supabase Dashboard SQL Editor'de çalışır
UPDATE auth.users
SET email = LOWER(email)
WHERE email != LOWER(email);

-- Kontrol için:
-- SELECT id, username, full_name FROM profiles WHERE username != LOWER(username);
-- SELECT id, email FROM auth.users WHERE email != LOWER(email);
