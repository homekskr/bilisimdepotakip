-- ==========================================
-- Bilişim Depo Takip Sistemi - Güvenlik Sıkılaştırma (DÜZELTİLMİŞ)
-- Tarih: 29.12.2025
-- Açıklama: Infinite recursion hatasını önlemek için yardımcı fonksiyonlar eklendi.
-- ==========================================

-- 0. YARDIMCI GÜVENLİK FONKSİYONLARI (Recursion Önleyici)
---------------------------------------------------------
-- Bu fonksiyonlar SECURITY DEFINER olduğu için RLS'yi baypas eder ve recursion hatasını önler.

CREATE OR REPLACE FUNCTION public.check_is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.check_is_authorized()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'depo', 'yonetici', 'baskan')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1. PROFİLLER (PROFILES) - GİZLİLİK VE YETKİ KONTROLÜ
---------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Profiles viewable by owner or authorized" ON public.profiles;
DROP POLICY IF EXISTS "Profiles insertable by owner" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all fields" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own details but not role" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Sadece kendi profilini veya yetkili isen başkalarını gör (FONKSİYON KULLANILDI)
CREATE POLICY "Profiles viewable by owner or authorized" ON public.profiles
FOR SELECT USING (
    id = auth.uid() OR public.check_is_authorized()
);

-- Sadece auth.uid() ile eşleşen profil oluşturulabilir
CREATE POLICY "Profiles insertable by owner" ON public.profiles
FOR INSERT WITH CHECK (id = auth.uid());

-- Admin/Yönetici herkesi günceller (FONKSİYON KULLANILDI)
CREATE POLICY "Admins can update all fields" ON public.profiles
FOR UPDATE USING (public.check_is_admin());

CREATE POLICY "Users can update own details but not role" ON public.profiles
FOR UPDATE USING (id = auth.uid())
WITH CHECK (
    id = auth.uid() AND 
    (role = (SELECT role FROM public.profiles WHERE id = auth.uid()))
);

-- 2. TALEPLER (REQUESTS) - KOLON İSMİ DÜZELTME VE GÜVENLİK
---------------------------------------------------------
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can see own or authorized can see all" ON public.requests;
DROP POLICY IF EXISTS "Any authenticated can insert request" ON public.requests;
DROP POLICY IF EXISTS "Authorized can update requests" ON public.requests;
DROP POLICY IF EXISTS "Users can delete own pending requests" ON public.requests;
DROP POLICY IF EXISTS "Herkes talepleri görebilir" ON public.requests;
DROP POLICY IF EXISTS "Kullanıcılar talep oluşturabilir" ON public.requests;
DROP POLICY IF EXISTS "Yetkililer talepleri güncelleyebilir" ON public.requests;
DROP POLICY IF EXISTS "Kullanıcılar kendi taleplerini iptal edebilir" ON public.requests;

-- (FONKSİYON KULLANILDI)
CREATE POLICY "Users can see own or authorized can see all" ON public.requests
FOR SELECT USING (
    requested_by = auth.uid() OR public.check_is_authorized()
);

CREATE POLICY "Any authenticated can insert request" ON public.requests
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- (FONKSİYON KULLANILDI)
CREATE POLICY "Authorized can update requests" ON public.requests
FOR UPDATE USING (public.check_is_authorized());

CREATE POLICY "Users can delete own pending requests" ON public.requests
FOR DELETE USING (
    (requested_by = auth.uid() AND status = 'beklemede') OR public.check_is_admin()
);

-- 3. GÜVENLİ FONKSİYONLAR (RPC) - YETKİ KONTROLÜ EKLEME
---------------------------------------------------------

-- Fonksiyon imzaları değişebileceği için önce eskilerini siliyoruz
DROP FUNCTION IF EXISTS public.update_material_stock_secure(UUID, UUID, INTEGER, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.create_assignment_secure(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, UUID, UUID);

-- update_material_stock_secure fonksiyonunu yetki kontrolü ile güncelle
CREATE OR REPLACE FUNCTION public.update_material_stock_secure(
    p_material_id UUID,
    p_user_id UUID,
    p_change_amount INTEGER,
    p_type TEXT,
    p_notes TEXT DEFAULT NULL
) 
RETURNS JSON AS $$
DECLARE
    v_old_qty INTEGER;
    v_new_qty INTEGER;
BEGIN
    -- YETKİ KONTROLÜ (Helper Fonksiyon)
    IF NOT public.check_is_authorized() THEN
        RETURN json_build_object('success', false, 'message', 'Yetkiniz yok');
    END IF;

    SELECT quantity INTO v_old_qty FROM public.materials WHERE id = p_material_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'Malzeme bulunamadı');
    END IF;

    v_new_qty := v_old_qty + p_change_amount;
    IF v_new_qty < 0 THEN
        RETURN json_build_object('success', false, 'message', 'Yetersiz stok!');
    END IF;

    UPDATE public.materials SET quantity = v_new_qty, updated_at = now() WHERE id = p_material_id;

    INSERT INTO public.stock_movements (
        material_id, user_id, type, change_amount, previous_quantity, new_quantity, notes
    ) VALUES (
        p_material_id, auth.uid(), p_type, p_change_amount, v_old_qty, v_new_qty, p_notes
    );

    RETURN json_build_object('success', true, 'new_quantity', v_new_qty);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- create_assignment_secure fonksiyonunu yetki kontrolü ile güncelle
CREATE OR REPLACE FUNCTION public.create_assignment_secure(
    p_material_id UUID,
    p_assigned_to TEXT,
    p_institution TEXT,
    p_building TEXT,
    p_unit TEXT,
    p_target_personnel TEXT,
    p_target_title TEXT,
    p_quantity INTEGER,
    p_assigned_by UUID,
    p_request_id UUID DEFAULT NULL
) 
RETURNS JSON AS $$
DECLARE
    v_current_stock INTEGER;
BEGIN
    -- YETKİ KONTROLÜ (Helper Fonksiyon)
    IF NOT public.check_is_authorized() THEN
        RETURN json_build_object('success', false, 'message', 'Yetkiniz yok');
    END IF;

    SELECT quantity INTO v_current_stock FROM public.materials WHERE id = p_material_id;
    IF v_current_stock < p_quantity THEN
        RETURN json_build_object('success', false, 'message', 'Yetersiz stok!');
    END IF;

    UPDATE public.materials SET quantity = quantity - p_quantity, updated_at = NOW() WHERE id = p_material_id;

    INSERT INTO public.assignments (
        material_id, assigned_to, institution, building, unit, 
        target_personnel, target_title, quantity, assigned_by, 
        request_id, status, assigned_date
    ) VALUES (
        p_material_id, p_assigned_to, p_institution, p_building, p_unit, 
        p_target_personnel, p_target_title, p_quantity, auth.uid(), 
        p_request_id, 'aktif', NOW()
    );

    INSERT INTO public.stock_movements (
        material_id, user_id, type, change_amount, previous_quantity, new_quantity, notes
    ) VALUES (
        p_material_id, auth.uid(), 'zimmet', -p_quantity, v_current_stock, v_current_stock - p_quantity, 'Zimmet oluşturuldu'
    );

    IF p_request_id IS NOT NULL THEN
        UPDATE public.requests SET status = 'tamamlandi', updated_at = NOW() WHERE id = p_request_id;
    END IF;

    RETURN json_build_object('success', true, 'message', 'Zimmet oluşturuldu');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
