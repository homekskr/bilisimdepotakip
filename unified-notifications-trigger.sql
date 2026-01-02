-- ==========================================
-- BİRLEŞİK BİLDİRİM TETİKLEYİCİSİ (UNIFIED TRIGGER)
-- In-App + Push + SMS (Hepsi Bir Arada)
-- ==========================================

CREATE OR REPLACE FUNCTION public.handle_new_request_notification()
RETURNS TRIGGER AS $$
DECLARE
    user_rec RECORD;
    v_title TEXT;
    v_message TEXT;
    v_link TEXT;
    v_push_api_url TEXT := 'https://bilisimdepotakip-snowy.vercel.app/api/send-push';
    v_sms_api_url TEXT := 'https://bilisimdepotakip-snowy.vercel.app/api/send-sms';
    -- Mevcut çalışan API key kullanılır:
    v_api_key TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9paXBwbXpqZWFpeHN6Z3dlYnpzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjUxODExNCwiZXhwIjoyMDgyMDk0MTE0fQ.JYUdzOxNX1p6lR5OYEVHZC9IJGmYWUfBvsIFLfC9GbM';
BEGIN
    -- 1. DURUM: YENİ TALEP OLUŞTURULDU (Personel -> Yetkililer)
    IF (TG_OP = 'INSERT') THEN
        v_title := 'Yeni Malzeme Talebi';
        v_message := NEW.requested_type || ' için yeni bir talep oluşturuldu.';
        v_link := '#requests';

        FOR user_rec IN SELECT id FROM public.profiles WHERE role IN ('yonetici', 'baskan', 'admin') LOOP
            -- In-App
            INSERT INTO public.notifications (user_id, title, message, type, link)
            VALUES (user_rec.id, v_title, v_message, 'info', v_link);

            -- Push
            PERFORM net.http_post(
                url := v_push_api_url,
                headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_api_key),
                body := jsonb_build_object('user_id', user_rec.id, 'title', v_title, 'message', v_message, 'link', v_link)
            );

            -- SMS
            PERFORM net.http_post(
                url := v_sms_api_url,
                headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_api_key),
                body := jsonb_build_object('user_id', user_rec.id, 'title', v_title, 'message', v_message)
            );
        END LOOP;
        RETURN NEW;
    END IF;

    -- 2. DURUM: DURUM GÜNCELLEMESİ (UPDATE)
    IF (TG_OP = 'UPDATE') AND (OLD.status <> NEW.status) THEN
        
        -- A. Yönetici Onayladı -> Başkan'a Bildir
        IF (NEW.status = 'yonetici_onayi') THEN
            v_title := 'Talep Onay Bekliyor';
            v_message := NEW.requested_type || ' talebi yönetici tarafından onaylandı, başkan onayı bekleniyor.';
            v_link := '#requests';

            FOR user_rec IN SELECT id FROM public.profiles WHERE role IN ('baskan', 'admin') LOOP
                INSERT INTO public.notifications (user_id, title, message, type, link)
                VALUES (user_rec.id, v_title, v_message, 'warning', v_link);

                PERFORM net.http_post(url := v_push_api_url, headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_api_key), body := jsonb_build_object('user_id', user_rec.id, 'title', v_title, 'message', v_message, 'link', v_link));
                PERFORM net.http_post(url := v_sms_api_url, headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_api_key), body := jsonb_build_object('user_id', user_rec.id, 'title', v_title, 'message', v_message));
            END LOOP;
        END IF;

        -- B. Başkan Onayladı -> Depocu'ya ve Kullanıcıya Bildir
        IF (NEW.status = 'onaylandi') THEN
            v_title := 'Talep Onaylandı';
            v_message := NEW.requested_type || ' talebi başkan tarafından onaylandı. Zimmet işlemleri yapılabilir.';
            v_link := '#requests';

            -- Depo ve Adminlere
            FOR user_rec IN SELECT id FROM public.profiles WHERE role IN ('depo', 'admin') LOOP
                INSERT INTO public.notifications (user_id, title, message, type, link)
                VALUES (user_rec.id, v_title, v_message, 'success', v_link);
                PERFORM net.http_post(url := v_push_api_url, headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_api_key), body := jsonb_build_object('user_id', user_rec.id, 'title', v_title, 'message', v_message, 'link', v_link));
            END LOOP;

            -- Talebi yapan kullanıcıya (Sadece Push ve In-App, SMS opsiyonel)
            INSERT INTO public.notifications (user_id, title, message, type, link)
            VALUES (NEW.requested_by, 'Talebiniz Onaylandı', NEW.requested_type || ' talebiniz onaylandı. Depodan teslim alabilirsiniz.', 'success', v_link);
            PERFORM net.http_post(url := v_push_api_url, headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_api_key), body := jsonb_build_object('user_id', NEW.requested_by, 'title', 'Talebiniz Onaylandı', 'message', NEW.requested_type || ' talebiniz onaylandı.', 'link', v_link));
        END IF;

        -- C. Zimmetlendi (Tamamlandı) -> Kullanıcıya Bildir
        IF (NEW.status = 'tamamlandi') THEN
            INSERT INTO public.notifications (user_id, title, message, type, link)
            VALUES (NEW.requested_by, 'Malzeme Zimmetlendi', NEW.requested_type || ' malzemeniz başarıyla zimmetlendi.', 'success', '#assignments');
            PERFORM net.http_post(url := v_push_api_url, headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_api_key), body := jsonb_build_object('user_id', NEW.requested_by, 'title', 'Malzeme Zimmetlendi', 'message', 'Malzemeniz üzerinize zimmetlendi.', 'link', '#assignments'));
        END IF;

        -- D. Reddedildi -> Kullanıcıya Bildir
        IF (NEW.status = 'reddedildi') THEN
            INSERT INTO public.notifications (user_id, title, message, type, link)
            VALUES (NEW.requested_by, 'Talep Reddedildi', NEW.requested_type || ' talebiniz reddedildi.', 'error', '#requests');
            PERFORM net.http_post(url := v_push_api_url, headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_api_key), body := jsonb_build_object('user_id', NEW.requested_by, 'title', 'Talep Reddedildi', 'message', 'Maalesef talebiniz onaylanmadı.', 'link', '#requests'));
        END IF;

        RETURN NEW;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger'ı bağla
DROP TRIGGER IF EXISTS on_request_change_notification ON public.requests;
CREATE TRIGGER on_request_change_notification
AFTER INSERT OR UPDATE ON public.requests
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_request_notification();
