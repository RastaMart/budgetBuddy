/*
  # Remove RLS policies and recreate tables
  
  1. Changes
    - Drop existing tables
    - Recreate tables without RLS policies
    - Keep all existing columns and constraints
    - Remove all policies
  
  2. Tables Modified
    - budgets
    - transactions
*/

-- Drop existing tables (in correct order due to foreign key constraints)
DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS budgets;

-- Recreate budgets table without RLS
CREATE TABLE budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  amount numeric(10,2) NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index for user_id
CREATE INDEX idx_budgets_user_id ON budgets(user_id);

-- Recreate transactions table without RLS
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