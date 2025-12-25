-- Fix material_id relationship in assignments table
-- This ensures material_id is UUID type and has proper foreign key constraint
-- Run this in Supabase SQL Editor

DO $$ 
BEGIN
    -- 1. Check if material_id exists and its type
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'assignments' 
        AND column_name = 'material_id'
        AND data_type != 'uuid'
    ) THEN
        -- Drop existing foreign key constraint if exists
        IF EXISTS (
            SELECT 1 
            FROM information_schema.table_constraints 
            WHERE constraint_name = 'assignments_material_id_fkey'
        ) THEN
            ALTER TABLE assignments DROP CONSTRAINT assignments_material_id_fkey;
            RAISE NOTICE 'Dropped existing material_id foreign key constraint';
        END IF;

        -- Drop the column with wrong type
        ALTER TABLE assignments DROP COLUMN material_id;
        RAISE NOTICE 'Dropped material_id column with wrong type';

        -- Re-create with correct UUID type
        ALTER TABLE assignments ADD COLUMN material_id UUID;
        RAISE NOTICE 'Created material_id column with UUID type';
    END IF;

    -- 2. Ensure foreign key constraint exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'assignments_material_id_fkey'
    ) THEN
        ALTER TABLE assignments
        ADD CONSTRAINT assignments_material_id_fkey
        FOREIGN KEY (material_id)
        REFERENCES materials(id)
        ON DELETE CASCADE;
        
        RAISE NOTICE 'Added foreign key constraint for material_id';
    END IF;

    -- 3. Make sure material_id is NOT NULL (optional, depends on your requirements)
    -- Uncomment if you want to enforce this
    -- ALTER TABLE assignments ALTER COLUMN material_id SET NOT NULL;

END $$;

-- Refresh Schema Cache
NOTIFY pgrst, 'reload schema';

-- Verify the fix
SELECT 
    a.id,
    a.material_id,
    m.name as material_name,
    a.assigned_to,
    a.quantity,
    a.status
FROM assignments a
LEFT JOIN materials m ON a.material_id = m.id
ORDER BY a.assigned_date DESC
LIMIT 10;
