-- ==========================================
-- Final Notification Trigger - Updated Flow
-- ==========================================

CREATE OR REPLACE FUNCTION public.handle_new_request_notification()
RETURNS TRIGGER AS $$
DECLARE
    user_rec RECORD;
    notification_id UUID;
    sms_api_url TEXT := 'https://bilisimdepotakip-snowy.vercel.app/api/send-sms';
    api_key TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9paXBwbXpqZWFpeHN6Z3dlYnpzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjUxODExNCwiZXhwIjoyMDgyMDk0MTE0fQ.JYUdzOxNX1p6lR5OYEVHZC9IJGmYWUfBvsIFLfC9GbM';
BEGIN
    -- YENİ TALEP (INSERT) - Personel → Yönetici
    IF (TG_OP = 'INSERT') THEN
        FOR user_rec IN SELECT id FROM public.profiles WHERE role = 'yonetici' LOOP
            -- In-app bildirim
            INSERT INTO public.notifications (user_id, title, message, type, link)
            VALUES (
                user_rec.id, 
                'Talep Onayınız Bekleniyor', 
                NEW.requested_type || ' - Lütfen sistem üzerinden kontrol ediniz.', 
                'info',
                '#requests'
            );

            -- SMS gönder
            PERFORM net.http_post(
                url := sms_api_url,
                headers := jsonb_build_object(
                    'Content-Type', 'application/json',
                    'Authorization', 'Bearer ' || api_key
                ),
                body := jsonb_build_object(
                    'user_id', user_rec.id,
                    'title', 'BİLİŞİM DEPO TAKİP-TALEP ONAYINIZ BEKLENİYOR',
                    'message', NEW.requested_type || ' - Lütfen sistem üzerinden kontrol ediniz.'
                )
            );
        END LOOP;
        RETURN NEW;
    END IF;

    -- DURUM GÜNCELLEMESİ (UPDATE)
    IF (TG_OP = 'UPDATE') AND (OLD.status <> NEW.status) THEN
        
        -- 1. Yönetici Onayladı → Başkan
        IF (NEW.status = 'yonetici_onayi') THEN
             FOR user_rec IN SELECT id FROM public.profiles WHERE role = 'baskan' LOOP
                INSERT INTO public.notifications (user_id, title, message, type, link)
                VALUES (
                    user_rec.id, 
                    'Talep Onayınız Bekleniyor (2. Seviye)', 
                    NEW.requested_type || ' - Lütfen sistem üzerinden kontrol ediniz.', 
                    'warning',
                    '#requests'
                );

                PERFORM net.http_post(
                    url := sms_api_url,
                    headers := jsonb_build_object(
                        'Content-Type', 'application/json',
                        'Authorization', 'Bearer ' || api_key
                    ),
                    body := jsonb_build_object(
                        'user_id', user_rec.id,
                        'title', 'BİLİŞİM DEPO TAKİP-TALEP ONAYINIZ BEKLENİYOR (2. SEVİYE)',
                        'message', NEW.requested_type || ' - Lütfen sistem üzerinden kontrol ediniz.'
                    )
                );
            END LOOP;
        END IF;

        -- 2. Başkan Onayladı → Depo + Personel
        IF (NEW.status = 'onaylandi') THEN
            -- Depo rolüne bildirim
            FOR user_rec IN SELECT id FROM public.profiles WHERE role = 'depo' LOOP
                INSERT INTO public.notifications (user_id, title, message, type, link)
                VALUES (
                    user_rec.id, 
                    'Onaylanan Talep', 
                    NEW.requested_type || ' - Lütfen sistem üzerinden kontrol ederek depo çıkış ve zimmet süreçlerini tamamlayınız.', 
                    'success',
                    '#requests'
                );

                PERFORM net.http_post(
                    url := sms_api_url,
                    headers := jsonb_build_object(
                        'Content-Type', 'application/json',
                        'Authorization', 'Bearer ' || api_key
                    ),
                    body := jsonb_build_object(
                        'user_id', user_rec.id,
                        'title', 'BİLİŞİM DEPO TAKİP-ONAYLANAN TALEP',
                        'message', NEW.requested_type || ' - Lütfen sistem üzerinden kontrol ederek depo çıkış ve zimmet süreçlerini tamamlayınız.'
                    )
                );
            END LOOP;

            -- Talebi oluşturan personele bildirim
            INSERT INTO public.notifications (user_id, title, message, type, link)
            VALUES (
                NEW.requested_by, 
                'Talebiniz Onaylandı', 
                NEW.requested_type || ' - Lütfen depodan malzemeyi teslim alarak kurulum süreçlerini tamamlayınız.', 
                'success',
                '#requests'
            );

            PERFORM net.http_post(
                url := sms_api_url,
                headers := jsonb_build_object(
                    'Content-Type', 'application/json',
                    'Authorization', 'Bearer ' || api_key
                ),
                body := jsonb_build_object(
                    'user_id', NEW.requested_by,
                    'title', 'BİLİŞİM DEPO TAKİP-ONAYLANAN TALEP',
                    'message', NEW.requested_type || ' - Lütfen depodan malzemeyi teslim alarak kurulum süreçlerini tamamlayınız.'
                )
            );
        END IF;

        -- 3. Reddedildi → Sadece in-app bildirim (SMS YOK)
        IF (NEW.status = 'reddedildi') THEN
            INSERT INTO public.notifications (user_id, title, message, type, link)
            VALUES (
                NEW.requested_by, 
                'Talebiniz Reddedildi', 
                NEW.requested_type || ' - Talep işleminiz onaylanmadı. Detaylar için taleplerim sayfasına bakınız.', 
                'error',
                '#requests'
            );
            -- SMS gönderilmiyor
        END IF;

        RETURN NEW;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
