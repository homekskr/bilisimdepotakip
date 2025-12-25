-- SECURITY HARDENING & RLS RESTORATION
-- Bu script, geçici olarak kapatılan güvenlik katmanını (RLS) yeniden aktif eder.

BEGIN;

-- 1. ESKİ/TEST TABLOLARINI TEMİZLE (İsteğe bağlı, kafa karışıklığını önler)
DROP TABLE IF EXISTS public.api_test;
DROP TABLE IF EXISTS public._schema_check;

-- 2. RLS'YI TÜM ANA TABLOLARDA AKTİF ET
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;

-- 3. POLİTİKALARI SIFIRLA VE YENİDEN KUR
-- Not: Önce eskileri siliyoruz ki çakışma olmasın.

-- PROFILES POLİTİKALARI
DROP POLICY IF EXISTS "Herkes kendi profilini görebilir" ON profiles;
DROP POLICY IF EXISTS "Herkes kendi profilini güncelleyebilir" ON profiles;
DROP POLICY IF EXISTS "Yeni kullanıcılar profil oluşturabilir" ON profiles;
DROP POLICY IF EXISTS "Sistem yöneticisi tüm profilleri görebilir" ON profiles;

CREATE POLICY "Herkes kendi profilini görebilir" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Sistem yöneticisi tüm profilleri görebilir" ON profiles FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Herkes kendi profilini güncelleyebilir" ON profiles FOR UPDATE USING (auth.uid() = id);

-- MATERIALS POLİTİKALARI
DROP POLICY IF EXISTS "Herkes malzemeleri görebilir" ON materials;
DROP POLICY IF EXISTS "Yetkililer malzeme yönetebilir" ON materials;

CREATE POLICY "Herkes malzemeleri görebilir" ON materials FOR SELECT TO authenticated USING (true);
CREATE POLICY "Yetkililer malzeme ekleyebilir/güncelleyebilir" ON materials FOR ALL TO authenticated 
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'depo', 'yonetici', 'baskan')));

-- ASSIGNMENTS POLİTİKALARI
DROP POLICY IF EXISTS "Herkes zimmetleri görebilir" ON assignments;
DROP POLICY IF EXISTS "Admin ve Depo zimmet yönetebilir" ON assignments;

CREATE POLICY "Herkes zimmetleri görebilir" ON assignments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin ve Depo zimmet ekleyebilir/güncelleyebilir" ON assignments FOR ALL TO authenticated 
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'depo')));

-- REQUESTS POLİTİKALARI
DROP POLICY IF EXISTS "Herkes talepleri görebilir" ON requests;
DROP POLICY IF EXISTS "Kullanıcılar kendi taleplerini yönetebilir" ON requests;
DROP POLICY IF EXISTS "Yöneticiler talepleri onaylayabilir" ON requests;

CREATE POLICY "Herkes talepleri görebilir" ON requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "Kullanıcılar kendi taleplerini oluşturabilir" ON requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = requested_by);
CREATE POLICY "Yetkililer talepleri güncelleyebilir" ON requests FOR UPDATE TO authenticated 
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'yonetici', 'baskan')));

COMMIT;

NOTIFY pgrst, 'reload schema';
