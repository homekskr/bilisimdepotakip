-- SECURE ASSIGNMENT CREATION FUNCTION (V2 - WITH REQUEST CHECK)
-- Bu fonksiyon stok kontrolü, zimmet oluşturma, stok güncelleme ve talep durumunu 
-- tek bir transaksiyon içinde ve atomik olarak yapar.

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
) RETURNS JSONB AS $$
DECLARE
    v_current_quantity INTEGER;
    v_request_status TEXT;
    v_assignment_id UUID;
    v_result JSONB;
BEGIN
    -- 0. Talep kontrolü (Eğer bir talebe bağlıysa ve zaten tamamlandıysa mükerrer kaydı engelle)
    IF p_request_id IS NOT NULL THEN
        SELECT status INTO v_request_status FROM public.requests WHERE id = p_request_id FOR UPDATE;
        IF v_request_status = 'tamamlandi' THEN
            RETURN jsonb_build_object('success', false, 'message', 'Bu talep için zaten zimmet çıkışı yapılmış!');
        END IF;
    END IF;

    -- 1. Stok kontrolü (FOR UPDATE ile satırı kilitliyoruz)
    SELECT quantity INTO v_current_quantity
    FROM public.materials
    WHERE id = p_material_id
    FOR UPDATE;

    IF v_current_quantity < p_quantity THEN
        RETURN jsonb_build_object('success', false, 'message', 'Yetersiz stok! Mevcut: ' || v_current_quantity);
    END IF;

    -- 2. Zimmet Oluştur
    INSERT INTO public.assignments (
        material_id,
        assigned_to,
        institution,
        building,
        unit,
        target_personnel,
        target_title,
        quantity,
        assigned_by,
        request_id,
        status,
        assigned_date
    ) VALUES (
        p_material_id,
        p_assigned_to,
        p_institution,
        p_building,
        p_unit,
        p_target_personnel,
        p_target_title,
        p_quantity,
        p_assigned_by,
        p_request_id,
        'aktif',
        NOW()
    ) RETURNING id INTO v_assignment_id;

    -- 3. Stok Güncelle
    UPDATE public.materials
    SET quantity = v_current_quantity - p_quantity,
        updated_at = NOW()
    WHERE id = p_material_id;

    -- 4. Varsa Talebi Güncelle
    IF p_request_id IS NOT NULL THEN
        UPDATE public.requests
        SET status = 'tamamlandi',
            updated_at = NOW()
        WHERE id = p_request_id;
    END IF;

    v_result := jsonb_build_object(
        'success', true, 
        'message', 'Zimmet başarıyla oluşturuldu', 
        'assignment_id', v_assignment_id
    );

    RETURN v_result;

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', 'İşlem sırasında hata: ' || SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.create_assignment_secure TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_assignment_secure TO service_role;
