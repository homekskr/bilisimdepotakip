-- REQUESTS TABLOSU STATUS KISITLAMASINI GÜNCELLE
-- "tamamlandi" durumu mevcut kısıtlamada eksik olduğu için hata veriyordu.

DO $$ 
BEGIN
    -- Eski kısıtlamayı kaldır (eğer varsa)
    ALTER TABLE public.requests DROP CONSTRAINT IF EXISTS requests_status_check;
    
    -- Yeni ve kapsayıcı kısıtlamayı ekle
    ALTER TABLE public.requests ADD CONSTRAINT requests_status_check 
    CHECK (status IN ('beklemede', 'yonetici_onayi', 'baskan_onayi', 'onaylandi', 'reddedildi', 'tamamlandi', 'iade_alindi'));
    
    RAISE NOTICE 'Requests status kısıtlaması başarıyla güncellendi.';
END $$;
