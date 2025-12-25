-- Fix Assignments - Requests Relationship (Correcting Type Mismatch)
-- Run this in Supabase SQL Editor

DO $$ 
BEGIN
    -- 1. Drop the constraint if it exists (to avoid dependencies)
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'assignments_request_id_fkey') THEN
        ALTER TABLE assignments DROP CONSTRAINT assignments_request_id_fkey;
    END IF;

    -- 2. Drop the column if it exists (it has wrong type BIGINT)
    -- We drop it instead of altering to avoid casting issues, assuming old data is invalid anyway
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assignments' AND column_name = 'request_id') THEN
        ALTER TABLE assignments DROP COLUMN request_id;
        RAISE NOTICE 'Dropped existing request_id column (wrong type)';
    END IF;

    -- 3. Re-create the column with correct UUID type
    ALTER TABLE assignments ADD COLUMN request_id UUID;
    RAISE NOTICE 'Created request_id column with UUID type';

    -- 4. Add the Foreign Key Constraint
    ALTER TABLE assignments
    ADD CONSTRAINT assignments_request_id_fkey
    FOREIGN KEY (request_id)
    REFERENCES requests(id)
    ON DELETE SET NULL;
    
    RAISE NOTICE 'Added Foreign Key constraint assignments_request_id_fkey';
END $$;

-- Refresh Schema Cache
NOTIFY pgrst, 'reload schema';
