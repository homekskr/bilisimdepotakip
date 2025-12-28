-- ==========================================
-- Requests Tablosu İçin RLS Politikaları
-- Taleplerin görüntülenmesi, oluşturulması, güncellenmesi ve silinmesi
-- ==========================================

-- Önce mevcut politikaları temizle (varsa)
DROP POLICY IF EXISTS "Herkes talepleri görebilir" ON requests;
DROP POLICY IF EXISTS "Kullanıcılar talep oluşturabilir" ON requests;
DROP POLICY IF EXISTS "Yetkililer talepleri güncelleyebilir" ON requests;
DROP POLICY IF EXISTS "Kullanıcılar kendi taleplerini iptal edebilir" ON requests;

-- 1. SELECT: Herkes kendi taleplerini görebilir, yetkililer hepsini görebilir
CREATE POLICY "Herkes talepleri görebilir" ON requests 
FOR SELECT 
USING (
    -- Personel sadece kendi taleplerini görür
    (requested_by = auth.uid()) OR
    -- Yetkililer (admin, depo, yonetici, baskan) tüm talepleri görür
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'depo', 'yonetici', 'baskan')
    )
);

-- 2. INSERT: Depo hariç herkes talep oluşturabilir
CREATE POLICY "Kullanıcılar talep oluşturabilir" ON requests 
FOR INSERT 
WITH CHECK (
    -- Depo görevlileri talep oluşturamaz
    NOT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role = 'depo'
    )
);

-- 3. UPDATE: Sadece yetkililer (admin, yonetici, baskan, depo) talepleri güncelleyebilir
CREATE POLICY "Yetkililer talepleri güncelleyebilir" ON requests 
FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'depo', 'yonetici', 'baskan')
    )
);

-- 4. DELETE: Kullanıcılar sadece beklemede olan kendi taleplerini iptal edebilir
CREATE POLICY "Kullanıcılar kendi taleplerini iptal edebilir" ON requests 
FOR DELETE 
USING (
    -- Talebi oluşturan kişi ve talep beklemede durumunda
    (requested_by = auth.uid() AND status = 'beklemede') OR
    -- Veya admin
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role = 'admin'
    )
);
