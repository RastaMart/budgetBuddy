/*
  # Add timezone support to profiles
  
  1. Changes
    - Add timezone column to profiles table
    - Set default timezone from browser
    - Update trigger to handle timezone
  
  2. Tables Modified
    - profiles
*/

-- Add timezone column to profiles
ALTER TABLE profiles 
ADD COLUMN timezone text NOT NULL DEFAULT 'UTC';

-- Update the profile creation function to include timezone
CREATE OR REPLACE FUNCTION create_profile_for_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, timezone)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      NEW.email
    ),
    COALESCE(NEW.raw_user_meta_data->>'timezone', 'UTC')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;