/*
  # Update budget table to use timeframes
  
  1. Changes
    - Remove start_date and end_date columns
    - Add timeframe column (weekly, monthly, yearly)
  
  2. Tables Modified
    - budgets
*/

-- Drop existing tables (in correct order due to foreign key constraints)
DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS budgets;

-- Recreate budgets table with timeframe
CREATE TABLE budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  amount numeric(10,2) NOT NULL,
  timeframe text NOT NULL CHECK (timeframe IN ('weekly', 'monthly', 'yearly')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index for user_id
CREATE INDEX idx_budgets_user_id ON budgets(user_id);

-- Recreate transactions table
CREATE TABLE transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  budget_id uuid NOT NULL,
  amount numeric(10,2) NOT NULL,
  description text NOT NULL,
  date date NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  FOREIGN KEY (budget_id) REFERENCES budgets(id) ON DELETE CASCADE
);

-- Create indexes for transactions
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_budget_id ON transactions(budget_id);