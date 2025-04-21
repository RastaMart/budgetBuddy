/*
  # Fix Budget RLS Policies

  1. Changes
    - Remove existing RLS policies for budgets table that were causing circular dependency
    - Add new RLS policies that allow:
      - Authenticated users to create budgets
      - Users to view budgets they are members of
      - Budget owners to update and delete their budgets
  
  2. Security
    - Maintains security by ensuring users can only:
      - Create new budgets when authenticated
      - View budgets they are members of
      - Update/delete budgets they own
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can create budgets" ON budgets;
DROP POLICY IF EXISTS "Users can insert budgets if they are owners" ON budgets;
DROP POLICY IF EXISTS "Users can view their budgets" ON budgets;
DROP POLICY IF EXISTS "Users can update their budgets" ON budgets;
DROP POLICY IF EXISTS "Users can delete their budgets" ON budgets;

-- Create new policies
CREATE POLICY "Enable insert for authenticated users" 
ON budgets FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Enable select for users who are members" 
ON budgets FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM budget_users 
    WHERE budget_users.budget_id = id 
    AND budget_users.user_id = auth.uid()
  )
);

CREATE POLICY "Enable update for budget owners" 
ON budgets FOR UPDATE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM budget_users 
    WHERE budget_users.budget_id = id 
    AND budget_users.user_id = auth.uid()
    AND budget_users.role = 'owner'
  )
) 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM budget_users 
    WHERE budget_users.budget_id = id 
    AND budget_users.user_id = auth.uid()
    AND budget_users.role = 'owner'
  )
);

CREATE POLICY "Enable delete for budget owners" 
ON budgets FOR DELETE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM budget_users 
    WHERE budget_users.budget_id = id 
    AND budget_users.user_id = auth.uid()
    AND budget_users.role = 'owner'
  )
);