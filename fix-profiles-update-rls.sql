-- ==========================================
-- Profiles Tablosu RLS Politikalarını Kontrol Et
-- ==========================================

-- Mevcut politikaları görmek için:
SELECT * FROM pg_policies WHERE tablename = 'profiles';

-- Eğer UPDATE politikası yoksa veya yanlışsa, düzeltin:

-- 1. Eski UPDATE politikasını silin (varsa)
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;

-- 2. Yeni UPDATE politikası ekleyin
CREATE POLICY "Admins can update all profiles" ON profiles
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- Not: Bu politika sadece admin'lerin profil güncellemesine izin verir
-- Eğer kullanıcılar kendi profillerini de güncelleyebilsin isterseniz:
-- CREATE POLICY "Users can update own profile" ON profiles
-- FOR UPDATE
-- USING (id = auth.uid());
