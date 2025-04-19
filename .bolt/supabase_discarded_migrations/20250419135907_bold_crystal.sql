/*
  # Make budget_id optional in transactions table
  
  1. Changes
    - Modify transactions table to make budget_id nullable
    - Keep existing data intact
    - Update foreign key constraint
  
  2. Tables Modified
    - transactions
*/

-- Modify the transactions table to make budget_id nullable
ALTER TABLE transactions 
  ALTER COLUMN budget_id DROP NOT NULL;

-- Drop the existing foreign key constraint
ALTER TABLE transactions
  DROP CONSTRAINT transactions_budget_id_fkey;

-- Add the new foreign key constraint that allows null values
ALTER TABLE transactions
  ADD CONSTRAINT transactions_budget_id_fkey 
  FOREIGN KEY (budget_id) 
  REFERENCES budgets(id) 
  ON DELETE SET NULL;