-- 1. Stok Hareketleri Tablosu oluşturma
CREATE TABLE IF NOT EXISTS public.stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    material_id UUID REFERENCES public.materials(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id),
    type TEXT NOT NULL CHECK (type IN ('ekleme', 'zimmet', 'iade', 'duzenleme', 'olusturma', 'silme')),
    change_amount INTEGER NOT NULL,
    previous_quantity INTEGER NOT NULL,
    new_quantity INTEGER NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Güvenli Stok Güncelleme ve Loglama Fonksiyonu
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
    -- Mevcut stoğu al
    SELECT quantity INTO v_old_qty FROM public.materials WHERE id = p_material_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'Malzeme bulunamadı');
    END IF;

    -- Yeni stoğu hesapla
    v_new_qty := v_old_qty + p_change_amount;

    IF v_new_qty < 0 THEN
        RETURN json_build_object('success', false, 'message', 'Yetersiz stok! Mevcut: ' || v_old_qty);
    END IF;

    -- 1. Malzemeyi güncelle
    UPDATE public.materials 
    SET quantity = v_new_qty, 
        updated_at = now() 
    WHERE id = p_material_id;

    -- 2. Hareketi logla
    INSERT INTO public.stock_movements (
        material_id, 
        user_id, 
        type, 
        change_amount, 
        previous_quantity, 
        new_quantity, 
        notes
    ) VALUES (
        p_material_id,
        p_user_id,
        p_type,
        p_change_amount,
        v_old_qty,
        v_new_qty,
        p_notes
    );

    RETURN json_build_object('success', true, 'new_quantity', v_new_qty);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. RLS Politikaları
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Herkes stok hareketlerini görebilir" ON public.stock_movements
    FOR SELECT USING (true);

CREATE POLICY "Sadece admin ve depo hareket ekleyebilir" ON public.stock_movements
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'depo')
        )
    );
