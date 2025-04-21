/*
  # Remove policies from budgets table
  
  1. Changes
    - Drop all existing policies from budgets table
    - Create single insert policy for authenticated users
    - Keep budget_users policies unchanged
  
  2. Security
    - Budgets table will only have insert policy
    - All access control will be handled through budget_users policies
*/

-- Drop all existing policies from budgets table
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON budgets;
DROP POLICY IF EXISTS "Enable select for users who are members" ON budgets;
DROP POLICY IF EXISTS "Enable update for budget owners" ON budgets;
DROP POLICY IF EXISTS "Enable delete for budget owners" ON budgets;

-- Create single insert policy for authenticated users
CREATE POLICY "Enable insert for authenticated users"
ON budgets
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';