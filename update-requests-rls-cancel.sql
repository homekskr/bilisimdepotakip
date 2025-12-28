-- ==========================================
-- Requests Tablosu DELETE Politikasını Güncelle
-- Yönetici veya Başkan onayı varsa iptal edilemesin
-- ==========================================

-- Önce mevcut DELETE politikasını kaldır
DROP POLICY IF EXISTS "Kullanıcılar kendi taleplerini iptal edebilir" ON requests;

-- Yeni DELETE politikası: Sadece beklemede VE henüz onaylanmamış talepleri iptal edebilir
CREATE POLICY "Kullanıcılar kendi taleplerini iptal edebilir" ON requests 
FOR DELETE 
USING (
    -- Talebi oluşturan kişi ve talep beklemede durumunda ve henüz onaylanmamış
    (
        requested_by = auth.uid() 
        AND status = 'beklemede' 
        AND manager_approval IS NULL 
        AND president_approval IS NULL
    ) 
    OR
    -- Veya admin her zaman silebilir
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role = 'admin'
    )
);
