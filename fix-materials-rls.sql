-- ==========================================
-- Materials Tablosu RLS Politikasını Kontrol Et ve Düzelt
-- Zimmetler sayfasında malzeme isimlerinin görünmesi için
-- ==========================================

-- Mevcut politikaları görmek için (Supabase Dashboard'da SQL Editor'de çalıştırın):
-- SELECT * FROM pg_policies WHERE tablename = 'materials';

-- Eğer "Herkes malzemeleri görebilir" politikası yoksa, ekleyin:
DROP POLICY IF EXISTS "Herkes malzemeleri görebilir" ON materials;

CREATE POLICY "Herkes malzemeleri görebilir" ON materials 
FOR SELECT 
USING (true);

-- Not: Bu politika zaten supabase-setup.sql'de var ama bazen uygulanmamış olabilir
-- Eğer hala sorun devam ederse, RLS'in etkin olduğundan emin olun:
-- ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
