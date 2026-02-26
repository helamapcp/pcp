
-- Assign default operador role to users without a role
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'operador'::app_role
FROM auth.users u
LEFT JOIN public.user_roles ur ON ur.user_id = u.id
WHERE ur.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;
