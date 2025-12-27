-- ==========================================
-- FIXED: Update Notification Trigger to Call Vercel API
-- ==========================================

-- IMPORTANT: Replace YOUR_SUPABASE_SERVICE_KEY_HERE with your actual service key
-- Get it from: Supabase Dashboard → Settings → API → service_role key

CREATE OR REPLACE FUNCTION public.handle_new_request_notification()
RETURNS TRIGGER AS $$
DECLARE
    target_users UUID[];
    user_rec RECORD;
    notification_id UUID;
    api_url TEXT := 'https://bilisimdepotakip-snowy.vercel.app/api/send-push';
    -- REPLACE THIS WITH YOUR ACTUAL SERVICE KEY:
    api_key TEXT := 'YOUR_SUPABASE_SERVICE_KEY_HERE';
BEGIN
    -- YENİ TALEP (INSERT)
    IF (TG_OP = 'INSERT') THEN
        -- Yönetici, Başkan ve Adminlere bildirim gönder
        FOR user_rec IN SELECT id FROM public.profiles WHERE role IN ('yonetici', 'baskan', 'admin') LOOP
            INSERT INTO public.notifications (user_id, title, message, type, link)
            VALUES (
                user_rec.id, 
                'Yeni Malzeme Talebi', 
                'Yeni bir talep oluşturuldu: ' || NEW.requested_type, 
                'info',
                '#requests'
            )
            RETURNING id INTO notification_id;

            -- Call Vercel API for push notification
            PERFORM net.http_post(
                url := api_url,
                headers := jsonb_build_object(
                    'Content-Type', 'application/json',
                    'Authorization', 'Bearer ' || api_key
                ),
                body := jsonb_build_object(
                    'user_id', user_rec.id,
                    'title', 'Yeni Malzeme Talebi',
                    'message', 'Yeni bir talep oluşturuldu: ' || NEW.requested_type,
                    'link', '#requests'
                )
            );
        END LOOP;
        RETURN NEW;
    END IF;

    -- DURUM GÜNCELLEMESİ (UPDATE)
    IF (TG_OP = 'UPDATE') AND (OLD.status <> NEW.status) THEN
        
        -- 1. Yönetici Onayladı -> Başkan'a ve Admin'e Haber Ver
        IF (NEW.status = 'yonetici_onayi') THEN
             FOR user_rec IN SELECT id FROM public.profiles WHERE role IN ('baskan', 'admin') LOOP
                INSERT INTO public.notifications (user_id, title, message, type, link)
                VALUES (
                    user_rec.id, 
                    'Onay Bekleyen Talep', 
                    'Yönetici onayı tamamlanan bir talep onayınızı bekliyor.', 
                    'warning',
                    '#requests'
                )
                RETURNING id INTO notification_id;

                PERFORM net.http_post(
                    url := api_url,
                    headers := jsonb_build_object(
                        'Content-Type', 'application/json',
                        'Authorization', 'Bearer ' || api_key
                    ),
                    body := jsonb_build_object(
                        'user_id', user_rec.id,
                        'title', 'Onay Bekleyen Talep',
                        'message', 'Yönetici onayı tamamlanan bir talep onayınızı bekliyor.',
                        'link', '#requests'
                    )
                );
            END LOOP;
        END IF;

        -- 2. Başkan Onayladı -> Depocu'ya Haber Ver
        IF (NEW.status = 'onaylandi') THEN
             FOR user_rec IN SELECT id FROM public.profiles WHERE role IN ('depo', 'admin') LOOP
                INSERT INTO public.notifications (user_id, title, message, type, link)
                VALUES (
                    user_rec.id, 
                    'Zimmetlenecek Talep', 
                    'Başkan onayı tamamlanan bir talep zimmet çıkışı bekliyor.', 
                    'success',
                    '#requests'
                )
                RETURNING id INTO notification_id;

                PERFORM net.http_post(
                    url := api_url,
                    headers := jsonb_build_object(
                        'Content-Type', 'application/json',
                        'Authorization', 'Bearer ' || api_key
                    ),
                    body := jsonb_build_object(
                        'user_id', user_rec.id,
                        'title', 'Zimmetlenecek Talep',
                        'message', 'Başkan onayı tamamlanan bir talep zimmet çıkışı bekliyor.',
                        'link', '#requests'
                    )
                );
            END LOOP;
        END IF;

        -- 3. Zimmetlendi (Tamamlandı) -> Talep Edene Haber Ver
        IF (NEW.status = 'tamamlandi') THEN
            INSERT INTO public.notifications (user_id, title, message, type, link)
            VALUES (
                NEW.requested_by, 
                'Talebiniz Hazır', 
                'Talep ettiğiniz malzeme zimmetlendi ve teslim edilmeye hazır.', 
                'success',
                '#assignments'
            )
            RETURNING id INTO notification_id;

            PERFORM net.http_post(
                url := api_url,
                headers := jsonb_build_object(
                    'Content-Type', 'application/json',
                    'Authorization', 'Bearer ' || api_key
                ),
                body := jsonb_build_object(
                    'user_id', NEW.requested_by,
                    'title', 'Talebiniz Hazır',
                    'message', 'Talep ettiğiniz malzeme zimmetlendi ve teslim edilmeye hazır.',
                    'link', '#assignments'
                )
            );
        END IF;

        -- 4. Reddedildi -> Talep Edene Haber Ver
        IF (NEW.status = 'reddedildi') THEN
            INSERT INTO public.notifications (user_id, title, message, type, link)
            VALUES (
                NEW.requested_by, 
                'Talebiniz Reddedildi', 
                'Talep işleminiz onaylanmadı. Detaylar için taleplerim sayfasına bakınız.', 
                'error',
                '#requests'
            )
            RETURNING id INTO notification_id;

            PERFORM net.http_post(
                url := api_url,
                headers := jsonb_build_object(
                    'Content-Type', 'application/json',
                    'Authorization', 'Bearer ' || api_key
                ),
                body := jsonb_build_object(
                    'user_id', NEW.requested_by,
                    'title', 'Talebiniz Reddedildi',
                    'message', 'Talep işleminiz onaylanmadı. Detaylar için taleplerim sayfasına bakınız.',
                    'link', '#requests'
                )
            );
        END IF;

        RETURN NEW;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
