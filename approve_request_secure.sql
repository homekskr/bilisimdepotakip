-- ==========================================
-- Talepler İçin Güvenli Onay Fonksiyonu (RPC)
-- ==========================================

CREATE OR REPLACE FUNCTION public.approve_request_secure(
    p_request_id UUID,
    p_approver_id UUID,
    p_material_id UUID,
    p_quantity INTEGER,
    p_role TEXT, -- 'manager' veya 'president'
    p_is_approve BOOLEAN
) 
RETURNS JSON AS $$
DECLARE
    v_current_stock INTEGER;
    v_material_name TEXT;
    v_status TEXT;
BEGIN
    -- 1. Reddetme durumu ise stok kontrolüne gerek yok
    IF NOT p_is_approve THEN
        UPDATE public.requests 
        SET 
            status = 'reddedildi',
            manager_approval = CASE WHEN p_role = 'manager' THEN 'reddedildi' ELSE manager_approval END,
            president_approval = CASE WHEN p_role = 'president' THEN 'reddedildi' ELSE president_approval END,
            manager_approved_by = CASE WHEN p_role = 'manager' THEN p_approver_id ELSE manager_approved_by END,
            president_approved_by = CASE WHEN p_role = 'president' THEN p_approver_id ELSE president_approved_by END,
            manager_approved_at = CASE WHEN p_role = 'manager' THEN NOW() ELSE manager_approved_at END,
            president_approved_at = CASE WHEN p_role = 'president' THEN NOW() ELSE president_approved_at END,
            updated_at = NOW()
        WHERE id = p_request_id;
        
        RETURN json_build_object('success', true, 'message', 'Talep reddedildi');
    END IF;

    -- 2. Onaylama durumu ise Stok Kontrolü
    SELECT quantity, name INTO v_current_stock, v_material_name 
    FROM public.materials 
    WHERE id = p_material_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'Seçilen malzeme bulunamadı');
    END IF;

    IF v_current_stock < p_quantity THEN
        RETURN json_build_object('success', false, 'message', 'Yetersiz stok! ' || v_material_name || ' için mevcut: ' || v_current_stock);
    END IF;

    -- 3. Durum Belirleme
    IF p_role = 'manager' THEN
        v_status := 'yonetici_onayi';
    ELSE
        v_status := 'onaylandi';
    END IF;

    -- 4. Güncelleme
    UPDATE public.requests 
    SET 
        status = v_status,
        material_id = p_material_id,
        quantity = p_quantity,
        manager_approval = CASE WHEN p_role = 'manager' THEN 'onaylandi' ELSE manager_approval END,
        president_approval = CASE WHEN p_role = 'president' THEN 'onaylandi' ELSE president_approval END,
        manager_approved_by = CASE WHEN p_role = 'manager' THEN p_approver_id ELSE manager_approved_by END,
        president_approved_by = CASE WHEN p_role = 'president' THEN p_approver_id ELSE president_approved_by END,
        manager_approved_at = CASE WHEN p_role = 'manager' THEN NOW() ELSE manager_approved_at END,
        president_approved_at = CASE WHEN p_role = 'president' THEN NOW() ELSE president_approved_at END,
        updated_at = NOW()
    WHERE id = p_request_id;

    RETURN json_build_object('success', true, 'message', 'Talep başarıyla onaylandı');

EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'message', 'Hata: ' || SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
