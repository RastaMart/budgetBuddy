/*
  # Fix Budget RLS Policies

  1. Changes
    - Update RLS policies for budgets table to allow initial budget creation
    - Modify insert policy to allow authenticated users to create budgets
    - Keep existing policies for other operations (select, update, delete)
  
  2. Security
    - Maintains security by ensuring users can only:
      - Create new budgets (as authenticated users)
      - Access budgets they are members of
      - Update/delete budgets they own
*/

-- Drop existing insert policy
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON budgets;

-- Create new insert policy that allows authenticated users to create budgets
CREATE POLICY "Enable insert for authenticated users" ON budgets
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Note: We keep the existing select/update/delete policies as they are correct:
-- Select: Users can only view budgets they are members of (via budget_users)
-- Update/Delete: Users can only modify budgets they own (via budget_users with role='owner')