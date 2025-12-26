-- ==========================================
-- Bilişim Depo Takip - Bildirim Sistemi Migrasyonu
-- ==========================================

-- 1. Bildirimler Tablosu
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
    link TEXT,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS Politikaları
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Kullanıcılar kendi bildirimlerini görebilir" 
ON public.notifications FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Kullanıcılar kendi bildirimlerini güncelleyebilir (okundu bilgisi)" 
ON public.notifications FOR UPDATE 
USING (auth.uid() = user_id);

-- 2. Otomatik Bildirim Tetikleyicisi (Function)
CREATE OR REPLACE FUNCTION public.handle_new_request_notification()
RETURNS TRIGGER AS $$
DECLARE
    target_users UUID[];
    user_rec RECORD;
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
            );
        END IF;

        RETURN NEW;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Trigger Tanımlama
DROP TRIGGER IF EXISTS on_request_change_notification ON public.requests;

CREATE TRIGGER on_request_change_notification
AFTER INSERT OR UPDATE ON public.requests
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_request_notification();
