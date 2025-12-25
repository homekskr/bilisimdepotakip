-- FORCE CLEAN AUTH & PROFILES
-- Supabase panelinde silinemeyen hatalı kullanıcı kayıtlarını kökten temizler.

-- 1. İLİŞKİLERİ GEÇİCİ OLARAK GEVŞET (CASCADE İÇİN)
-- Not: Bu işlem zimmet verilerini SİLMEZ, sadece kullanıcı kaydını silmemize izin verir.
BEGIN;

-- 2. AUTH SİSTEMİNDEKİ TÜM İZLERİ SİL
-- E-posta adresi admin@ism.gov.tr veya admin@example.com olan her şeyi temizleyelim.
DO $$ 
DECLARE
    uid UUID;
BEGIN
    -- Önce ID'leri bulalım
    FOR uid IN (SELECT id FROM auth.users WHERE email IN ('admin@ism.gov.tr', 'admin@example.com')) LOOP
        -- Bağımlı auth tablolarını sil
        DELETE FROM auth.identities WHERE user_id = uid;
        DELETE FROM auth.sessions WHERE user_id = uid;
        DELETE FROM auth.refresh_tokens WHERE session_id IN (SELECT id FROM auth.sessions WHERE user_id = uid);
        
        -- Ana auth kaydını sil
        DELETE FROM auth.users WHERE id = uid;
    END LOOP;
END $$;

-- 3. ÇAKŞAN PROFİLLERİ TEMİZLE
-- Sadece auth tarafı silinmiş ama public tarafı kalmış 'admin' kullanıcı adını temizle.
-- Not: Eğer bu ID bir zimmete bağlıysa hata verebilir, bu yüzden sadece boştakileri siler.
DELETE FROM public.profiles 
WHERE username = 'admin' 
AND id NOT IN (SELECT assigned_by FROM public.assignments);

COMMIT;

-- 4. BİLGİLENDİRME
SELECT 'Temizlik tamamlandı. Şimdi Supabase panelinden (Authentication > Users) kullanıcıyı tekrar ekleyebilirsiniz.' as Sonuc;
