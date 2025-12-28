-- ==========================================
-- Profiles Tablosu INSERT RLS Politikasını Düzelt
-- Yeni kullanıcı oluşturma hatası: "new row violates row-level security policy"
-- ==========================================

-- Mevcut INSERT politikalarını kontrol et:
-- SELECT * FROM pg_policies WHERE tablename = 'profiles' AND cmd = 'INSERT';

-- Eski INSERT politikalarını sil
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON profiles;

-- Yeni INSERT politikası: Admin kullanıcıları yeni profil oluşturabilir
CREATE POLICY "Admins can insert profiles" ON profiles
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- Alternatif: Eğer herkes kendi profilini oluşturabilsin isterseniz:
-- CREATE POLICY "Users can insert own profile" ON profiles
-- FOR INSERT
-- WITH CHECK (id = auth.uid());

-- Test için:
-- Admin olarak giriş yapıp yeni kullanıcı oluşturmayı deneyin
