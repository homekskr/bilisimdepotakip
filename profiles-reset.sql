-- PROFILES TABLOSU İÇİN TAM TEMİZLİK VE RESET SORGUSU
-- Bu sorgu, tablodaki tüm gizli veya farklı isimli politikaları temizler.

DO $$ 
DECLARE 
    pol record;
BEGIN
    -- Profiles tablosundaki TÜM politikaları döngü ile sil
    FOR pol IN (SELECT policyname FROM pg_policies WHERE tablename = 'profiles' AND schemaname = 'public') 
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON profiles', pol.policyname);
    END LOOP;
END $$;

-- RLS'yi kapat ve aç (temiz başlangıç)
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- SADECE 3 TEMEL VE GÜVENLİ POLİTİKA EKLE

-- 1. OKUMA: Giriş yapmış herkes profilleri görebilir (DÖNGÜSÜZ)
CREATE POLICY "okuma_politikasi" 
ON profiles FOR SELECT 
TO authenticated 
USING (true);

-- 2. EKLEME: Herkes kendi profilini oluşturabilir
CREATE POLICY "ekleme_politikasi" 
ON profiles FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = id);

-- 3. GÜNCELLEME: Herkes kendi profilini güncelleyebilir
CREATE POLICY "guncelleme_politikasi" 
ON profiles FOR UPDATE 
TO authenticated 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- TEST: Eğer profiles tablosunda kendi ID'nizle bir kayıt yoksa oturum açamazsınız.
-- Admin kullanıcısının profilinin var olduğundan emin olun.
