-- Schema cache'i yenile
NOTIFY pgrst, 'reload config';

-- Garanti olsun diye fonksiyon sahipliğini ve yetkilerini tekrar ver
ALTER FUNCTION public.update_material_stock_secure(UUID, UUID, INTEGER, TEXT, TEXT) OWNER TO postgres;

GRANT EXECUTE ON FUNCTION public.update_material_stock_secureTo postgres, anon, authenticated, service_role;
