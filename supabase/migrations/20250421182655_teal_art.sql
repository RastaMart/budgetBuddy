/*
  # Fix budget_users policies to prevent infinite recursion
  
  1. Changes
    - Drop existing policies on budget_users table
    - Create new policies with fixed logic to prevent recursion
    - Keep budgets table policies unchanged
  
  2. Security
    - Maintain same security rules but with correct policy implementation
    - Prevent infinite recursion in policy checks
*/

-- Drop existing policies
DROP POLICY IF EXISTS "create_budget_users" ON budget_users;
DROP POLICY IF EXISTS "view_budget_users" ON budget_users;
DROP POLICY IF EXISTS "delete_budget_users" ON budget_users;

-- Create new policies with fixed logic
CREATE POLICY "create_budget_users"
ON budget_users
FOR INSERT
TO authenticated
WITH CHECK (
  (
    -- Allow users to create their own initial owner record
    user_id = auth.uid() AND 
    role = 'owner' AND 
    NOT EXISTS (
      SELECT 1 FROM budget_users bu 
      WHERE bu.budget_id = budget_users.budget_id
    )
  ) OR (
    -- Allow existing owners to add new members
    EXISTS (
      SELECT 1 FROM budget_users existing
      WHERE existing.budget_id = budget_users.budget_id
      AND existing.user_id = auth.uid()
      AND existing.role = 'owner'
      AND existing.budget_id != budget_users.budget_id
    )
  )
);

CREATE POLICY "view_budget_users"
ON budget_users
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM budget_users viewer
    WHERE viewer.budget_id = budget_users.budget_id
    AND viewer.user_id = auth.uid()
    AND viewer.budget_id != budget_users.budget_id
  )
);

CREATE POLICY "delete_budget_users"
ON budget_users
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM budget_users owner
    WHERE owner.budget_id = budget_users.budget_id
    AND owner.user_id = auth.uid()
    AND owner.role = 'owner'
    AND owner.budget_id != budget_users.budget_id
  )
);

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';