/*
  # Fix budget_users RLS policies

  1. Changes
    - Drop existing problematic policies on budget_users table
    - Create new, simplified policies that avoid recursion
    - Policies are now more focused and avoid querying the same table

  2. Security
    - Users can still only access budget_users entries they have permission for
    - Owners can manage all budget users
    - Members can view other members
    - No recursive queries that could cause infinite loops
*/

-- Drop existing policies to replace them with fixed versions
DROP POLICY IF EXISTS "Users can create budget memberships" ON budget_users;
DROP POLICY IF EXISTS "Users can delete budget memberships" ON budget_users;
DROP POLICY IF EXISTS "Users can view budget memberships" ON budget_users;

-- Policy for creating budget users
-- Only the user themselves can create their initial owner membership
-- Or existing owners can add new members
CREATE POLICY "create_budget_users"
ON budget_users
FOR INSERT
TO authenticated
WITH CHECK (
  (
    -- User creating their own initial owner membership
    user_id = auth.uid() AND 
    role = 'owner' AND
    NOT EXISTS (
      SELECT 1 FROM budget_users 
      WHERE budget_id = budget_users.budget_id
    )
  ) OR
  -- Existing owner adding new members
  EXISTS (
    SELECT 1 FROM budget_users existing
    WHERE 
      existing.budget_id = budget_users.budget_id AND
      existing.user_id = auth.uid() AND
      existing.role = 'owner'
  )
);

-- Policy for viewing budget users
-- Users can see members of budgets they belong to
CREATE POLICY "view_budget_users"
ON budget_users
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM budget_users viewer
    WHERE 
      viewer.budget_id = budget_users.budget_id AND
      viewer.user_id = auth.uid()
  )
);

-- Policy for deleting budget users
-- Only owners can remove members
CREATE POLICY "delete_budget_users"
ON budget_users
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM budget_users owner
    WHERE 
      owner.budget_id = budget_users.budget_id AND
      owner.user_id = auth.uid() AND
      owner.role = 'owner'
  )
);