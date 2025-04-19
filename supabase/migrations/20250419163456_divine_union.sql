/*
  # Add assigned date to transactions
  
  1. Changes
    - Add assigned_date column to transactions table
    - Set default value to date column
    - Update existing rows to set assigned_date equal to date
  
  2. Tables Modified
    - transactions
*/

-- Add assigned_date column
ALTER TABLE transactions
ADD COLUMN assigned_date date NOT NULL DEFAULT CURRENT_DATE;

-- Update existing rows to set assigned_date equal to date
UPDATE transactions
SET assigned_date = date;

-- Add index for better query performance
CREATE INDEX idx_transactions_assigned_date ON transactions(assigned_date);