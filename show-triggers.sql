-- TRIGGER LIST ONLY
-- Sadece tetikleyicileri listeler. Lütfen bu sonucu paylaşın.

SELECT 
    event_object_schema as "Schema",
    event_object_table as "Table",
    trigger_name as "Trigger Name"
FROM information_schema.triggers 
WHERE event_object_schema IN ('auth', 'public')
ORDER BY 1, 2;
