SELECT proname, proargnames 
FROM pg_proc 
WHERE proname = 'update_material_stock_secure';
