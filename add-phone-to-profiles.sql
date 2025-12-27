-- ==========================================
-- Add Phone Number to Profiles
-- ==========================================

-- Add phone column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS phone TEXT;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_profiles_phone 
ON public.profiles(phone);

-- Update RLS policies (phone is part of profile, existing policies cover it)
-- No additional RLS needed

COMMENT ON COLUMN public.profiles.phone IS 'User phone number for SMS notifications (format: 905001112233)';
