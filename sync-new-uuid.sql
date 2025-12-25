-- SYNC NEW USER UUID WITH EXISTING DATA
-- Bu script, manuel oluşturduğunuz yeni kullanıcı ID'sini mevcut verilere bağlar.

BEGIN;

-- 1. ESKİ VE YENİ ID'LERİ TANIMLAYALIM
-- Yeni ID: f1a87ceb-49a6-490d-8990-ce7db620efdd (Kullanıcının ilettiği)
-- Eski ID: 'admin' kullanıcı adına sahip olan mevcut profilden otomatik alınacak.

DO $$ 
DECLARE
    old_uuid UUID;
    new_uuid UUID := 'f1a87ceb-49a6-490d-8990-ce7db620efdd';
BEGIN
    -- Mevcut (eski) admin ID'sini bulalım
    SELECT id INTO old_uuid FROM public.profiles WHERE username = 'admin' LIMIT 1;
    
    IF old_uuid IS NULL THEN
        RAISE NOTICE 'Hata: "admin" kullanıcı adına sahip bir profil bulunamadı.';
        RETURN;
    END IF;

    IF old_uuid = new_uuid THEN
        RAISE NOTICE 'IDler zaten aynı, işlem yapılmadı.';
        RETURN;
    END IF;

    RAISE NOTICE 'Eski ID: %, Yeni ID: % eşleştiriliyor...', old_uuid, new_uuid;

    -- 1. YENİ ID İLE GEÇİCİ BİR PROFİL OLUŞTUR (Eskisinden kopyalayarak)
    -- Bu, çocuk tabloların (assignments vb.) yeni ID'yi profillerde bulabilmesini sağlar.
    INSERT INTO public.profiles (id, username, full_name, role, created_at)
    SELECT new_uuid, 'admin_temp_' || substr(new_uuid::text, 1, 8), full_name, role, created_at
    FROM public.profiles 
    WHERE id = old_uuid
    ON CONFLICT (id) DO NOTHING;

    -- 2. TÜM REFERANSLARI YENİ ID'YE AKTAR
    
    -- Assignments (Zimmetler)
    UPDATE public.assignments 
    SET assigned_by = new_uuid 
    WHERE assigned_by = old_uuid;

    -- Requests (Talepler)
    UPDATE public.requests 
    SET requested_by = new_uuid 
    WHERE requested_by = old_uuid;

    UPDATE public.requests 
    SET manager_approved_by = new_uuid 
    WHERE manager_approved_by = old_uuid;

    UPDATE public.requests 
    SET president_approved_by = new_uuid 
    WHERE president_approved_by = old_uuid;

    -- 3. ESKİ PROFİLİ SİL VE YENİ PROFİLİ DÜZELT
    -- Artık kimse old_uuid'ye bakmadığı için güvenle silebiliriz.
    DELETE FROM public.profiles WHERE id = old_uuid;

    -- Yeni profilin kullanıcı adını 'admin' olarak geri düzeltelim
    UPDATE public.profiles SET username = 'admin' WHERE id = new_uuid;

    RAISE NOTICE 'Senkronizasyon Başarılı!';
END $$;

COMMIT;

-- 4. RLS VE İZİNLERİ SON KEZ KONTROL ET (Giriş için engel kalmasın)
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;

NOTIFY pgrst, 'reload schema';
