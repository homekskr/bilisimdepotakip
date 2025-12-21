-- Bilişim Malzemeleri Depo Takip Sistemi - Supabase Database Setup

-- 1. Kullanıcı Profilleri Tablosu
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'baskan', 'yonetici', 'depo', 'personel')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Malzemeler Tablosu
CREATE TABLE IF NOT EXISTS materials (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    brand_model TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    specifications JSONB DEFAULT '{}',
    barcode TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Talepler Tablosu (assignments'tan önce oluşturulmalı)
CREATE TABLE IF NOT EXISTS requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    material_id UUID REFERENCES materials(id) ON DELETE CASCADE NOT NULL,
    requested_by UUID REFERENCES profiles(id) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'beklemede' CHECK (status IN ('beklemede', 'yonetici_onayi', 'baskan_onayi', 'onaylandi', 'reddedildi')),
    manager_approval TEXT CHECK (manager_approval IN ('onaylandi', 'reddedildi')),
    manager_approved_by UUID REFERENCES profiles(id),
    manager_approved_at TIMESTAMP WITH TIME ZONE,
    president_approval TEXT CHECK (president_approval IN ('onaylandi', 'reddedildi')),
    president_approved_by UUID REFERENCES profiles(id),
    president_approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Zimmetler Tablosu (requests'ten sonra oluşturulmalı)
CREATE TABLE IF NOT EXISTS assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    material_id UUID REFERENCES materials(id) ON DELETE CASCADE NOT NULL,
    assigned_to TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    assigned_by UUID REFERENCES profiles(id) NOT NULL,
    request_id UUID REFERENCES requests(id) ON DELETE SET NULL,
    assigned_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    return_date TIMESTAMP WITH TIME ZONE,
    status TEXT NOT NULL DEFAULT 'aktif' CHECK (status IN ('aktif', 'iade_edildi'))
);

-- Trigger: Malzeme güncellendiğinde updated_at'i otomatik güncelle
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_materials_updated_at
    BEFORE UPDATE ON materials
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_requests_updated_at
    BEFORE UPDATE ON requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Politikaları

-- Profiles tablosu için RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Herkes kendi profilini görebilir"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Herkes kendi profilini güncelleyebilir"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Yeni kullanıcılar profil oluşturabilir"
    ON profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Materials tablosu için RLS
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Herkes malzemeleri görebilir"
    ON materials FOR SELECT
    TO authenticated
    USING (true);

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

-- Assignments tablosu için RLS
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Herkes zimmetleri görebilir"
    ON assignments FOR SELECT
    TO authenticated
    USING (true);

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

-- Requests tablosu için RLS
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Herkes talepleri görebilir"
    ON requests FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Personel talep oluşturabilir"
    ON requests FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = requested_by);

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

-- İndeksler (Performans için)
CREATE INDEX idx_materials_type ON materials(type);
CREATE INDEX idx_materials_barcode ON materials(barcode);
CREATE INDEX idx_assignments_material_id ON assignments(material_id);
CREATE INDEX idx_assignments_status ON assignments(status);
CREATE INDEX idx_requests_status ON requests(status);
CREATE INDEX idx_requests_material_id ON requests(material_id);
CREATE INDEX idx_requests_requested_by ON requests(requested_by);

-- Örnek Kullanıcılar (Test için - Şifreler: 123456)
-- NOT: Gerçek kullanıcılar Supabase Auth üzerinden oluşturulmalıdır
-- Bu sadece profil tablolarına örnek veri ekler

COMMENT ON TABLE profiles IS 'Kullanıcı profil bilgileri - Supabase Auth ile entegre';
COMMENT ON TABLE materials IS 'Bilişim malzemeleri envanteri';
COMMENT ON TABLE assignments IS 'Malzeme zimmet kayıtları';
COMMENT ON TABLE requests IS 'Malzeme talep ve onay süreçleri';
