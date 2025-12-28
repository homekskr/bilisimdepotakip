-- ==========================================
-- Toplu Şifre Sıfırlama (Bulk Password Reset)
-- ==========================================

-- DİKKAT: Bu komut sistemdeki TÜM kullanıcıların şifresini 'yeniSifre123' yapar.
-- 'yeniSifre123' kısmını istediğiniz ortak şifre ile değiştirebilirsiniz.

UPDATE auth.users 
SET encrypted_password = crypt('yeniSifre123', gen_salt('bf')),
    email_confirmed_at = NOW(), -- Giriş hatasını önlemek için onaylıyoruz
    updated_at = NOW();

-- Eğer sadece belirli bir rolü (örn: personel) sıfırlamak isterseniz:
/*
UPDATE auth.users u
SET encrypted_password = crypt('yeniSifre123', gen_salt('bf')),
    email_confirmed_at = NOW(),
    updated_at = NOW()
FROM public.profiles p
WHERE u.id = p.id AND p.role = 'personel';
*/
