-- RLS Politikalarını Güncelleme (Admin Yetkileri İçin)

-- 1. Materials Tablosu Politikaları
DROP POLICY IF EXISTS "Depo görevlisi ve yöneticiler malzeme ekleyebilir" ON materials;
CREATE POLICY "Depo görevlisi ve yöneticiler malzeme ekleyebilir"
    ON materials FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'depo', 'yonetici', 'baskan')
        )
    );

DROP POLICY IF EXISTS "Depo görevlisi ve yöneticiler malzeme güncelleyebilir" ON materials;
CREATE POLICY "Depo görevlisi ve yöneticiler malzeme güncelleyebilir"
    ON materials FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'depo', 'yonetici', 'baskan')
        )
    );

DROP POLICY IF EXISTS "Sadece yöneticiler malzeme silebilir" ON materials;
CREATE POLICY "Sadece yöneticiler malzeme silebilir"
    ON materials FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'yonetici', 'baskan')
        )
    );

-- 2. Assignments Tablosu Politikaları
DROP POLICY IF EXISTS "Depo görevlisi zimmet oluşturabilir" ON assignments;
CREATE POLICY "Depo görevlisi zimmet oluşturabilir"
    ON assignments FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'depo')
        )
    );

DROP POLICY IF EXISTS "Depo görevlisi zimmet güncelleyebilir" ON assignments;
CREATE POLICY "Depo görevlisi zimmet güncelleyebilir"
    ON assignments FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'depo')
        )
    );

-- 3. Requests Tablosu Politikaları
DROP POLICY IF EXISTS "Yönetici ve başkan talepleri güncelleyebilir" ON requests;
CREATE POLICY "Yönetici ve başkan talepleri güncelleyebilir"
    ON requests FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'yonetici', 'baskan')
        )
    );

-- 4. Profiles Tablosu İçin Admin Yetkisi (Tüm profilleri görebilme)
DROP POLICY IF EXISTS "Adminler tüm profilleri görebilir" ON profiles;
CREATE POLICY "Adminler tüm profilleri görebilir"
    ON profiles FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role = 'admin'
        )
    );
