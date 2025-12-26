-- ==========================================
-- Debug: Check Push Subscriptions
-- ==========================================

-- 1. Check if subscriptions are being saved
SELECT 
    ps.id,
    ps.user_id,
    p.email,
    p.full_name,
    ps.endpoint,
    ps.created_at
FROM push_subscriptions ps
JOIN profiles p ON ps.user_id = p.id
ORDER BY ps.created_at DESC;

-- 2. Check recent notifications
SELECT 
    n.id,
    n.user_id,
    p.email,
    n.title,
    n.message,
    n.created_at
FROM notifications n
JOIN profiles p ON n.user_id = p.id
ORDER BY n.created_at DESC
LIMIT 10;

-- 3. Test the trigger manually (replace with actual user_id)
-- This will show if the trigger is working
INSERT INTO requests (
    requested_type,
    requested_by,
    institution,
    building,
    unit,
    target_personnel,
    target_title,
    quantity,
    reason,
    status
) VALUES (
    'Test Malzeme',
    'YOUR_USER_ID_HERE',  -- Replace with actual user_id
    'Test Kurum',
    'Test Bina',
    'Test Birim',
    'Test Personel',
    'Test Unvan',
    1,
    'Test için',
    'beklemede'
);
