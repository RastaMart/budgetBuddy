/*
  # Add budgets and user relationships
  
  1. New Tables
    - budgets
      - id (uuid, primary key)
      - name (text)
      - created_at (timestamp)
      - updated_at (timestamp)
    - budget_users
      - budget_id (uuid, references budgets)
      - user_id (uuid, references auth.users)
      - role (text, check constraint: owner or member)
      - created_at (timestamp)
  
  2. Security
    - Enable RLS on budgets and budget_users tables
    - Add policies for authenticated users
    - Create trigger for default budget creation
*/

-- Create budgets table
CREATE TABLE IF NOT EXISTS budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create budget_users junction table
CREATE TABLE IF NOT EXISTS budget_users (
  budget_id uuid REFERENCES budgets(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'member')),
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (budget_id, user_id)
);

-- Enable RLS
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_users ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their budgets"
  ON budgets
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM budget_users
      WHERE budget_users.budget_id = budgets.id
      AND budget_users.user_id = auth.uid()
    )
  );

-- Allow any authenticated user to create budgets
CREATE POLICY "Users can create budgets"
  ON budgets
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can view their budget memberships"
  ON budget_users
  FOR SELECT
  USING (user_id = auth.uid());

-- Allow any authenticated user to create budget memberships
CREATE POLICY "Users can create budget memberships"
  ON budget_users
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Create function to create default budget for new users
CREATE OR REPLACE FUNCTION create_default_budget()
RETURNS TRIGGER AS $$
DECLARE
  new_budget_id uuid;
BEGIN
  -- Create default budget
  INSERT INTO budgets (name)
  VALUES ('Personal Budget')
  RETURNING id INTO new_budget_id;

  -- Add user as owner
  INSERT INTO budget_users (budget_id, user_id, role)
  VALUES (new_budget_id, NEW.id, 'owner');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to create default budget for new users
DROP TRIGGER IF EXISTS create_default_budget_trigger ON auth.users;
CREATE TRIGGER create_default_budget_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_budget();