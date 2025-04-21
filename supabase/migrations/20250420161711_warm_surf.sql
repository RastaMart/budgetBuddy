/*
  # Enable RLS for profiles table

  1. Security Changes
    - Enable Row Level Security (RLS) on profiles table
    - Add policies for:
      - Authenticated users can read their own profile
      - Authenticated users can update their own profile
      - New users can insert their profile during signup
      - System can read all profiles (needed for joins)

  2. Notes
    - Policies ensure users can only access their own profile data
    - Service role can bypass RLS for system operations
*/

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own profile
CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow new users to insert their profile during signup
CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Allow the service role to read all profiles (needed for joins)
CREATE POLICY "Service role can read all profiles"
  ON profiles
  FOR SELECT
  TO service_role
  USING (true);