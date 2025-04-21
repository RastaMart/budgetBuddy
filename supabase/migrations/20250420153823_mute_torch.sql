/*
  # Remove RLS from all tables
  
  1. Changes
    - Disable RLS on budgets table
    - Disable RLS on budget_users table
    - Disable RLS on categories table
    - Disable RLS on transactions table
    - Drop all existing policies
  
  2. Tables Modified
    - budgets
    - budget_users
    - categories
    - transactions
*/

-- Drop all policies from budgets table
DROP POLICY IF EXISTS "Users can view their budgets" ON budgets;
DROP POLICY IF EXISTS "Users can create budgets" ON budgets;

-- Drop all policies from budget_users table
DROP POLICY IF EXISTS "Users can view their budget memberships" ON budget_users;
DROP POLICY IF EXISTS "Users can create budget memberships" ON budget_users;

-- Disable RLS on all tables
ALTER TABLE budgets DISABLE ROW LEVEL SECURITY;
ALTER TABLE budget_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;