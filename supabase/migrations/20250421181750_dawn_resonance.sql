/*
  # Set up complete budget management system
  
  1. Changes
    - Set up RLS policies for budgets table
    - Set up RLS policies for budget_users table
    - Create trigger for automatic owner assignment
    
  2. Security
    - Enable RLS on both tables
    - Ensure proper access control for all operations
*/

-- Enable RLS on both tables
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to ensure clean slate
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON budgets;
DROP POLICY IF EXISTS "Enable select for users who are members" ON budgets;
DROP POLICY IF EXISTS "Enable update for budget owners" ON budgets;
DROP POLICY IF EXISTS "Enable delete for budget owners" ON budgets;

DROP POLICY IF EXISTS "Users can create budget memberships" ON budget_users;
DROP POLICY IF EXISTS "Users can view budget memberships" ON budget_users;
DROP POLICY IF EXISTS "Users can delete budget memberships" ON budget_users;

-- Budget Policies
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
    WHERE budget_users.budget_id = budgets.id 
    AND budget_users.user_id = auth.uid()
  )
);

CREATE POLICY "Enable update for budget owners" 
ON budgets FOR UPDATE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM budget_users 
    WHERE budget_users.budget_id = budgets.id 
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
    WHERE budget_users.budget_id = budgets.id 
    AND budget_users.user_id = auth.uid()
    AND budget_users.role = 'owner'
  )
);

-- Budget Users Policies
CREATE POLICY "Users can create budget memberships"
ON budget_users FOR INSERT
TO authenticated
WITH CHECK (
  (
    -- Allow if user is the owner of the budget
    EXISTS (
      SELECT 1 FROM budget_users
      WHERE budget_users.budget_id = budget_users.budget_id
      AND budget_users.user_id = auth.uid()
      AND budget_users.role = 'owner'
    )
  ) OR (
    -- Or if this is the initial owner assignment
    budget_users.user_id = auth.uid()
    AND budget_users.role = 'owner'
    AND NOT EXISTS (
      SELECT 1 FROM budget_users
      WHERE budget_users.budget_id = budget_users.budget_id
    )
  )
);

CREATE POLICY "Users can view budget memberships"
ON budget_users FOR SELECT
TO authenticated
USING (
  budget_id IN (
    SELECT budget_id FROM budget_users
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete budget memberships"
ON budget_users FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM budget_users
    WHERE budget_users.budget_id = budget_users.budget_id
    AND budget_users.user_id = auth.uid()
    AND budget_users.role = 'owner'
  )
);

-- Create or replace the trigger function for automatic owner assignment
CREATE OR REPLACE FUNCTION handle_new_budget()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO budget_users (budget_id, user_id, role)
  VALUES (NEW.id, auth.uid(), 'owner');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS on_budget_created ON budgets;
CREATE TRIGGER on_budget_created
  AFTER INSERT ON budgets
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_budget();

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';