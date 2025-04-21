/*
  # Add profiles insert policy for new users

  1. Security Changes
    - Add RLS policy to allow new users to create their own profile during signup
    - This policy specifically allows the service role to create profiles for new users
*/

CREATE POLICY "Service role can create profiles"
  ON public.profiles
  FOR INSERT
  TO service_role
  WITH CHECK (true);