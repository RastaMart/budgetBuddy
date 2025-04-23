/*
  # Add biweekly timeframe option
  
  1. Changes
    - Update the timeframe check constraint to include 'biweekly'
  
  2. Constraints
    - timeframe must be one of: 'weekly', 'biweekly', 'monthly', 'yearly'
*/

DO $$ 
BEGIN
  -- Drop existing constraint
  ALTER TABLE categories DROP CONSTRAINT budgets_timeframe_check;
  
  -- Add updated constraint
  ALTER TABLE categories
    ADD CONSTRAINT budgets_timeframe_check 
    CHECK (timeframe IN ('weekly', 'biweekly', 'monthly', 'yearly'));
END $$;