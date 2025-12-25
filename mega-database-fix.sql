-- MEGA DATABASE FIX & SCHEMA REPAIR
-- Bu script, "Database error querying schema" hatasını çözer ve eksik sütunları ekler.

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. TABLES REPAIR
-- Profiles (Zaten var ama sağlama alalım)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'personel',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Materials
CREATE TABLE IF NOT EXISTS public.materials (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    brand_model TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    specifications TEXT,
    condition TEXT DEFAULT 'YENİ',
    barcode TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Eksik sütunları ekle (hata vermemesi için IF NOT EXISTS mantığıyla)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='materials' AND column_name='condition') THEN
        ALTER TABLE materials ADD COLUMN condition TEXT DEFAULT 'YENİ';
    END IF;
END $$;

-- Requests
CREATE TABLE IF NOT EXISTS public.requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    material_id UUID REFERENCES materials(id) ON DELETE SET NULL,
    requested_by UUID REFERENCES profiles(id) NOT NULL,
    requested_type TEXT,
    institution TEXT,
    building TEXT,
    unit TEXT,
    target_personnel TEXT,
    target_title TEXT,
    quantity INTEGER NOT NULL DEFAULT 1,
    reason TEXT,
    status TEXT DEFAULT 'beklemede',
    manager_approval TEXT,
    manager_approved_by UUID REFERENCES profiles(id),
    manager_approved_at TIMESTAMP WITH TIME ZONE,
    president_approval TEXT,
    president_approved_by UUID REFERENCES profiles(id),
    president_approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Assignments
CREATE TABLE IF NOT EXISTS public.assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    material_id UUID REFERENCES materials(id) ON DELETE CASCADE NOT NULL,
    assigned_to TEXT, -- Eski sütun, uyumluluk için duruyor
    institution TEXT,
    building TEXT,
    unit TEXT,
    target_personnel TEXT,
    target_title TEXT,
    quantity INTEGER NOT NULL DEFAULT 1,
    assigned_by UUID REFERENCES profiles(id) NOT NULL,
    request_id UUID REFERENCES requests(id) ON DELETE SET NULL,
    assigned_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    return_date TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'aktif'
);

-- 3. RLS FIX (RECURSION PREVENTION)
-- RLS'yi geçici olarak kapatıp temizleyelim
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE materials DISABLE ROW LEVEL SECURITY;
ALTER TABLE requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE assignments DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Herkes profilleri görebilir" ON profiles;
DROP POLICY IF EXISTS "Admin her şeyi yapabilir" ON profiles;
DROP POLICY IF EXISTS "Herkes malzemeleri görebilir" ON materials;
DROP POLICY IF EXISTS "Admin malzemeleri yönetebilir" ON materials;

-- YENİ VE GÜVENLİ POLİTİKALAR (Recursion içermeyen)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles_Select_Policy" ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Profiles_Update_Policy" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Materials_Select_Policy" ON materials FOR SELECT TO authenticated USING (true);
CREATE POLICY "Materials_All_Policy" ON materials FOR ALL TO authenticated USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'depo', 'yonetici')
);

ALTER TABLE requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Requests_Select_Policy" ON requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "Requests_Insert_Policy" ON requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = requested_by);
CREATE POLICY "Requests_Update_Policy" ON requests FOR UPDATE TO authenticated USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'yonetici', 'baskan') OR auth.uid() = requested_by
);

ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Assignments_Select_Policy" ON assignments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Assignments_All_Policy" ON assignments FOR ALL TO authenticated USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'depo')
);

-- 4. PERMISSIONS
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

-- 5. RELOAD SCHEMA CACHE (PostgREST için)
NOTIFY pgrst, 'reload schema';

DO $$ BEGIN
    RAISE NOTICE 'Veritabanı onarımı tamamlandı!';
END $$;
