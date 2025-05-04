/*
  # Add transaction type column

  1. Changes
    - Add `type` column to `transactions` table with allowed values:
      - 'account'
      - 'virtual' 
      - 'income_distribution'
    - Set default value to 'account'
    - Add check constraint to enforce valid types
*/

ALTER TABLE transactions 
ADD COLUMN type text NOT NULL DEFAULT 'account';

ALTER TABLE transactions 
ADD CONSTRAINT transactions_type_check 
CHECK (type IN ('account', 'virtual', 'income_distribution'));

-- Update existing transactions to have type='account'
UPDATE transactions SET type = 'account' WHERE type IS NULL;