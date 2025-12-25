-- RLS RECURSION FIX
-- 'profiles' tablosundaki sonsuz döngü hatasını (recursion) gidermek için yardımcı fonksiyon oluşturur.

BEGIN;

-- 1. YETKİ KONTROL FONKSİYONU OLUŞTUR
-- SECURITY DEFINER: Bu fonksiyon RLS atlayarak çalışır, bu sayede döngü oluşmaz.
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = user_id;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- 2. POLİTİKALARI GÜNCELLE
-- Eskileri sil
DROP POLICY IF EXISTS "Herkes kendi profilini görebilir" ON profiles;
DROP POLICY IF EXISTS "Sistem yöneticisi tüm profilleri görebilir" ON profiles;
DROP POLICY IF EXISTS "Herkes kendi profilini güncelleyebilir" ON profiles;

-- Yeni, döngü oluşturmayan politikaları ekle
CREATE POLICY "Herkes kendi profilini görebilir" ON profiles 
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Sistem yöneticisi tüm profilleri görebilir" ON profiles 
FOR SELECT USING (get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Yetkililer tüm profilleri görebilir" ON profiles 
FOR SELECT USING (get_user_role(auth.uid()) IN ('admin', 'yonetici', 'baskan', 'depo'));

CREATE POLICY "Herkes kendi profilini güncelleyebilir" ON profiles 
FOR UPDATE USING (auth.uid() = id);

-- MATERIALS tablosunu da bu fonksiyonla daha güvenli hale getirelim (opsiyonel ama daha iyi)
DROP POLICY IF EXISTS "Yetkililer malzeme ekleyebilir/güncelleyebilir" ON materials;
CREATE POLICY "Yetkililer malzeme ekleyebilir/güncelleyebilir" ON materials 
FOR ALL TO authenticated 
USING (get_user_role(auth.uid()) IN ('admin', 'depo', 'yonetici', 'baskan'));

-- ASSIGNMENTS ve REQUESTS için de benzer düzeltmeleri yapalım
DROP POLICY IF EXISTS "Admin ve Depo zimmet ekleyebilir/güncelleyebilir" ON assignments;
CREATE POLICY "Admin ve Depo zimmet ekleyebilir/güncelleyebilir" ON assignments 
FOR ALL TO authenticated 
USING (get_user_role(auth.uid()) IN ('admin', 'depo'));

DROP POLICY IF EXISTS "Yetkililer talepleri güncelleyebilir" ON requests;
CREATE POLICY "Yetkililer talepleri güncelleyebilir" ON requests 
FOR UPDATE TO authenticated 
USING (get_user_role(auth.uid()) IN ('admin', 'yonetici', 'baskan'));

COMMIT;

NOTIFY pgrst, 'reload schema';
