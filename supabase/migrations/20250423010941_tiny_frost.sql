/*
  # Add category type fields
  
  1. Changes
    - Add `type` column to categories table to track if it's spending or income
    - Add `amount_type` column to track if it's fixed or flexible
    - Add check constraints to ensure valid values
    - Set default values for existing records
  
  2. Constraints
    - type must be either 'spending' or 'income'
    - amount_type must be either 'fixed' or 'flexible'
*/

-- Add new columns with check constraints
ALTER TABLE categories 
ADD COLUMN type text NOT NULL DEFAULT 'spending',
ADD COLUMN amount_type text NOT NULL DEFAULT 'fixed';

-- Add check constraints
DO $$ 
BEGIN
  ALTER TABLE categories
    ADD CONSTRAINT categories_type_check 
    CHECK (type IN ('spending', 'income'));

  ALTER TABLE categories
    ADD CONSTRAINT categories_amount_type_check 
    CHECK (amount_type IN ('fixed', 'flexible'));
END $$;