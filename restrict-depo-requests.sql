-- RESTRICT DEPO FROM CREATING REQUESTS (RLS)
-- Depo rolünün veritabanı seviyesinde talep oluşturmasını engeller.

BEGIN;

-- get_user_role fonksiyonu zaten mevcut varsayıyoruz (fix-rls-recursion.sql ile eklenmişti)

DROP POLICY IF EXISTS "Kullanıcılar kendi taleplerini oluşturabilir" ON requests;

-- Yeni politika: Sadece depo olmayanlar kendi adına talep oluşturabilir
CREATE POLICY "Kullanıcılar kendi taleplerini oluşturabilir" ON requests 
FOR INSERT TO authenticated 
WITH CHECK (
    auth.uid() = requested_by 
    AND get_user_role(auth.uid()) != 'depo'
);

COMMIT;

NOTIFY pgrst, 'reload schema';
