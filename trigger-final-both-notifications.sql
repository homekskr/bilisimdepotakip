-- ==========================================
-- Update Notification Trigger - BOTH In-App + SMS
-- ==========================================

CREATE OR REPLACE FUNCTION public.handle_new_request_notification()
RETURNS TRIGGER AS $$
DECLARE
    target_users UUID[];
    user_rec RECORD;
    notification_id UUID;
    sms_api_url TEXT := 'https://bilisimdepotakip-snowy.vercel.app/api/send-sms';
    api_key TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9paXBwbXpqZWFpeHN6Z3dlYnpzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjUxODExNCwiZXhwIjoyMDgyMDk0MTE0fQ.JYUdzOxNX1p6lR5OYEVHZC9IJGmYWUfBvsIFLfC9GbM';
BEGIN
    -- YENİ TALEP (INSERT)
    IF (TG_OP = 'INSERT') THEN
        FOR user_rec IN SELECT id FROM public.profiles WHERE role IN ('yonetici', 'baskan', 'admin') LOOP
            -- 1. In-app bildirim oluştur
            INSERT INTO public.notifications (user_id, title, message, type, link)
            VALUES (
                user_rec.id, 
                'Yeni Malzeme Talebi', 
                'Yeni bir talep oluşturuldu: ' || NEW.requested_type, 
                'info',
                '#requests'
            )
            RETURNING id INTO notification_id;

            -- 2. SMS gönder
            PERFORM net.http_post(
                url := sms_api_url,
                headers := jsonb_build_object(
                    'Content-Type', 'application/json',
                    'Authorization', 'Bearer ' || api_key
                ),
                body := jsonb_build_object(
                    'user_id', user_rec.id,
                    'title', 'Yeni Malzeme Talebi',
                    'message', 'Yeni bir talep oluşturuldu: ' || NEW.requested_type
                )
            );
        END LOOP;
        RETURN NEW;
    END IF;

    -- DURUM GÜNCELLEMESİ (UPDATE)
    IF (TG_OP = 'UPDATE') AND (OLD.status <> NEW.status) THEN
        
        -- 1. Yönetici Onayladı
        IF (NEW.status = 'yonetici_onayi') THEN
             FOR user_rec IN SELECT id FROM public.profiles WHERE role IN ('baskan', 'admin') LOOP
                INSERT INTO public.notifications (user_id, title, message, type, link)
                VALUES (
                    user_rec.id, 
                    'Onay Bekleyen Talep', 
                    'Yönetici onayı tamamlanan bir talep onayınızı bekliyor.', 
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
                        'title', 'Onay Bekleyen Talep',
                        'message', 'Yönetici onayı tamamlanan bir talep onayınızı bekliyor.'
                    )
                );
            END LOOP;
        END IF;

        -- 2. Başkan Onayladı
        IF (NEW.status = 'onaylandi') THEN
             FOR user_rec IN SELECT id FROM public.profiles WHERE role IN ('depo', 'admin') LOOP
                INSERT INTO public.notifications (user_id, title, message, type, link)
                VALUES (
                    user_rec.id, 
                    'Zimmetlenecek Talep', 
                    'Başkan onayı tamamlanan bir talep zimmet çıkışı bekliyor.', 
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
                        'title', 'Zimmetlenecek Talep',
                        'message', 'Başkan onayı tamamlanan bir talep zimmet çıkışı bekliyor.'
                    )
                );
            END LOOP;
        END IF;

        -- 3. Tamamlandı
        IF (NEW.status = 'tamamlandi') THEN
            INSERT INTO public.notifications (user_id, title, message, type, link)
            VALUES (
                NEW.requested_by, 
                'Talebiniz Hazır', 
                'Talep ettiğiniz malzeme zimmetlendi ve teslim edilmeye hazır.', 
                'success',
                '#assignments'
            );

            PERFORM net.http_post(
                url := sms_api_url,
                headers := jsonb_build_object(
                    'Content-Type', 'application/json',
                    'Authorization', 'Bearer ' || api_key
                ),
                body := jsonb_build_object(
                    'user_id', NEW.requested_by,
                    'title', 'Talebiniz Hazır',
                    'message', 'Talep ettiğiniz malzeme zimmetlendi ve teslim edilmeye hazır.'
                )
            );
        END IF;

        -- 4. Reddedildi
        IF (NEW.status = 'reddedildi') THEN
            INSERT INTO public.notifications (user_id, title, message, type, link)
            VALUES (
                NEW.requested_by, 
                'Talebiniz Reddedildi', 
                'Talep işleminiz onaylanmadı. Detaylar için taleplerim sayfasına bakınız.', 
                'error',
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
                    'title', 'Talebiniz Reddedildi',
                    'message', 'Talep işleminiz onaylanmadı. Detaylar için taleplerim sayfasına bakınız.'
                )
            );
        END IF;

        RETURN NEW;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
