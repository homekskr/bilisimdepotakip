-- Check the current state of assignments and materials relationship
-- Run this in Supabase SQL Editor

-- 1. Check the data types of material_id in assignments table
SELECT 
    column_name, 
    data_type, 
    udt_name
FROM information_schema.columns 
WHERE table_name = 'assignments' AND column_name = 'material_id';

-- 2. Check the data types of id in materials table
SELECT 
    column_name, 
    data_type, 
    udt_name
FROM information_schema.columns 
WHERE table_name = 'materials' AND column_name = 'id';

-- 3. Check existing foreign key constraints on assignments table
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'assignments' AND tc.constraint_type = 'FOREIGN KEY';

-- 4. Check a sample assignment record to see the actual data
SELECT 
    id,
    material_id,
    assigned_to,
    quantity,
    status
FROM assignments
ORDER BY assigned_date DESC
LIMIT 5;

-- 5. Try to join and see if the relationship works
SELECT 
    a.id,
    a.material_id,
    m.id as material_table_id,
    m.name as material_name,
    a.assigned_to,
    a.quantity
FROM assignments a
LEFT JOIN materials m ON a.material_id = m.id
ORDER BY a.assigned_date DESC
LIMIT 5;
