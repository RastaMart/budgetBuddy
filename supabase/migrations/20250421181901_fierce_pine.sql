/*
  # Fix budget_users policy recursion

  1. Changes
    - Remove recursive policy check for budget_users table
    - Implement new policy logic that prevents recursion
    - Maintain security while allowing budget creation

  2. Security
    - Users can only create budget memberships if:
      a) They are the owner of the budget, OR
      b) They are creating the first owner record for a new budget
    - Maintains existing read/delete policies
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can create budget memberships" ON budget_users;

-- Create new non-recursive policy
CREATE POLICY "Users can create budget memberships" ON budget_users
FOR INSERT TO authenticated
WITH CHECK (
  -- Allow if user is creating their own owner record AND no other users exist for this budget
  (
    user_id = auth.uid() AND 
    role = 'owner' AND 
    NOT EXISTS (
      SELECT 1 
      FROM budget_users bu 
      WHERE bu.budget_id = budget_id
    )
  )
  OR
  -- Allow if user is already an owner of the budget
  EXISTS (
    SELECT 1 
    FROM budget_users bu 
    WHERE 
      bu.budget_id = budget_users.budget_id AND 
      bu.user_id = auth.uid() AND 
      bu.role = 'owner'
  )
);