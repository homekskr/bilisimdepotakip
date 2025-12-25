-- CHECK CONSTRAINTS LİSTELEME
SELECT
    conname AS constraint_name,
    pg_get_constraintdef(c.oid) AS constraint_definition
FROM
    pg_constraint c
JOIN
    pg_namespace n ON n.oid = c.connamespace
WHERE
    contype = 'c' -- check constraint
    AND n.nspname = 'public'
    AND conrelid::regclass::text = 'requests';
