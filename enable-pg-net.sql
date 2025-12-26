-- ==========================================
-- Enable pg_net Extension for HTTP Requests
-- ==========================================

-- 1. Enable the extension (required for trigger to make HTTP calls)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Grant necessary permissions
GRANT USAGE ON SCHEMA net TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA net TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA net TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA net TO postgres, anon, authenticated, service_role;

-- Note: Run this BEFORE running trigger-with-api-call.sql
