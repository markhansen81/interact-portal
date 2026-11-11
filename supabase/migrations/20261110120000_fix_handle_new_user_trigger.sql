-- Fix handle_new_user trigger which was failing on new user creation
-- (caused "Database error saving new user" for all invites)
-- Root cause: profiles columns without defaults (e.g. is_active) caused INSERT to fail

-- Ensure is_active has a default so trigger inserts don't fail
ALTER TABLE profiles ALTER COLUMN is_active SET DEFAULT true;

-- Replace the trigger function with a defensive version
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'ta'),
    true
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
