/*
  # Enable RLS and Add Policies

  1. Changes
    - Enable RLS on budget_categories, budgets, transactions, and deposits tables
    - Add policies for authenticated users to manage their own data

  2. Security
    - Users can only access their own data
    - All operations (SELECT, INSERT, UPDATE, DELETE) are restricted by user_id
*/

-- Enable RLS
ALTER TABLE budget_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE deposits ENABLE ROW LEVEL SECURITY;

-- Policies for budget_categories
CREATE POLICY "Users can manage their own budget categories"
  ON budget_categories
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policies for budgets
CREATE POLICY "Users can manage their own budgets"
  ON budgets
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policies for transactions
CREATE POLICY "Users can manage their own transactions"
  ON transactions
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policies for deposits
CREATE POLICY "Users can manage their own deposits"
  ON deposits
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);