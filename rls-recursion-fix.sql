-- RLS Rekürsiyon (Sonsuz Döngü) Hatası Çözümü

-- 1. Profiles tablosundaki hatalı politikaları temizle
DROP POLICY IF EXISTS "Adminler tüm profilleri görebilir" ON profiles;
DROP POLICY IF EXISTS "Herkes kendi profilini görebilir" ON profiles;

-- 2. Yeni ve güvenli (döngü içermeyen) politikayı ekle
-- Tüm giriş yapmış kullanıcılar profil listesini (isim ve rol) görebilir.
-- Bu, malzeme zimmetleme ve talep süreçleri için gereklidir.
CREATE POLICY "Giriş yapmış herkes profilleri görebilir"
    ON profiles FOR SELECT
    TO authenticated
    USING (true);

-- 3. Diğer tablolar (materials, assignments) için admin kontrolü döngü yaratmaz, onlar kalabilir.
-- Ancak emin olmak için materials üzerindekini de sadeleştirebiliriz.
