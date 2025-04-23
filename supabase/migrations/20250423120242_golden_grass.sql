/*
  # Add allocation_id to transactions table

  1. Changes
    - Add `allocation_id` column to `transactions` table
    - Add foreign key constraint to reference `category_allocations` table
    - Make the column nullable since not all transactions will have allocations

  2. Security
    - No changes to RLS policies needed as existing policies cover the new column
*/

-- Add allocation_id column
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transactions' 
    AND column_name = 'allocation_id'
  ) THEN
    ALTER TABLE transactions 
    ADD COLUMN allocation_id uuid REFERENCES category_allocations(id) ON DELETE SET NULL;
  END IF;
END $$;