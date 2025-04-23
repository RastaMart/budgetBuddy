/*
  # Add shared income type with percentage allocation
  
  1. Changes
    - Add 'shared_income' to category types
    - Add percentage allocation table for shared income categories
    - Add dynamic category reference for percentage calculation
  
  2. Security
    - Enable RLS on new table
    - Add policies for authenticated users
*/

-- Update category type constraint
DO $$ 
BEGIN
  -- Drop existing constraint
  ALTER TABLE categories DROP CONSTRAINT categories_type_check;
  
  -- Add updated constraint
  ALTER TABLE categories
    ADD CONSTRAINT categories_type_check 
    CHECK (type IN ('spending', 'income', 'shared_income'));
END $$;

-- Create table for percentage allocations
CREATE TABLE category_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  allocation_type text NOT NULL CHECK (allocation_type IN ('manual', 'dynamic')),
  percentage numeric(5,2) CHECK (percentage >= 0 AND percentage <= 100),
  reference_category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE category_allocations ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY "Users can manage their own allocations"
ON category_allocations
FOR ALL
TO authenticated
USING (
  category_id IN (
    SELECT id FROM categories WHERE user_id = auth.uid()
  )
);