/*
  # Rename budget to category
  
  1. Changes
    - Rename budgets table to categories
    - Update foreign key references
    - Update column names
  
  2. Tables Modified
    - budgets -> categories
    - transactions (foreign key reference)
*/

-- Rename the budgets table to categories
ALTER TABLE budgets RENAME TO categories;

-- Rename the budget_id column in transactions to category_id
ALTER TABLE transactions RENAME COLUMN budget_id TO category_id;

-- Rename the indexes
ALTER INDEX budgets_pkey RENAME TO categories_pkey;
ALTER INDEX idx_budgets_user_id RENAME TO idx_categories_user_id;

-- Drop the old foreign key constraint
ALTER TABLE transactions DROP CONSTRAINT transactions_budget_id_fkey;

-- Add the new foreign key constraint
ALTER TABLE transactions
  ADD CONSTRAINT transactions_category_id_fkey 
  FOREIGN KEY (category_id) 
  REFERENCES categories(id) 
  ON DELETE SET NULL;