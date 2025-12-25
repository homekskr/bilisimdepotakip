-- API SCHEMA EXPOSURE FIX (FOR POSTGREST)
-- Bu script, Supabase API'sinin (PostgREST) tabloları görmesini garanti eder.

-- 1. ŞEMAYA ERİŞİMİ SIFIRLA VE YENİDEN VER
REVOKE ALL ON SCHEMA public FROM anon, authenticated;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- 2. TÜM TABLOLAR İÇİN SELECT İZNİNİ ZORLA (Anonim okuma için bile)
-- Bu güvenlik için ideal değildir ama hatayı bulmak için gereklidir.
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated, service_role;

-- 3. POSTGREST'İN ŞEMAYI "YAYINLAMASINI" SAĞLA
-- Not: Bu komutlar sadece superuser (postgres) yetkisiyle tam etkili olur.
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO authenticated;

-- 4. ŞEYTANIN AVUKATI: ACABA TABLO MU YOK?
-- Bu tablo gerçekten varsa API üzerinden okunabilmeli.
CREATE TABLE IF NOT EXISTS api_test (id int primary key, test text);
INSERT INTO api_test (id, test) VALUES (1, 'API Çalışıyor') ON CONFLICT DO NOTHING;
GRANT SELECT ON api_test TO anon, authenticated;

-- 5. CACHE'İ ZORLA SIFIRLA
NOTIFY pgrst, 'reload schema';

DO $$ 
BEGIN 
    RAISE NOTICE 'API İzinleri güncellendi. Eğer hata devam ederse, Supabase Dashboard > Settings > API kısmından "Save" butonuna (veya varsa Refresh) basmayı deneyin.';
END $$;
