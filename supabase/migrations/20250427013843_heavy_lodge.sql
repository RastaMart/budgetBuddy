/*
  # Restructure allocations to link directly to budgets
  
  1. Changes
    - Create new budget_allocations table
    - Migrate existing data from category_allocations
    - Drop old category_allocations table
    - Remove allocation_id from transactions
  
  2. Security
    - Enable RLS on new table
    - Add policies for authenticated users
*/

-- Create new budget_allocations table
CREATE TABLE budget_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id uuid NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  name text NOT NULL,
  allocation_type text NOT NULL CHECK (allocation_type IN ('manual', 'dynamic')),
  percentage numeric(5,2) CHECK (percentage >= 0 AND percentage <= 100),
  reference_category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE budget_allocations ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY "Users can manage their own budget allocations"
ON budget_allocations
FOR ALL
TO authenticated
USING (
  budget_id IN (
    SELECT budget_id FROM budget_users WHERE user_id = auth.uid()
  )
);

-- Migrate existing data
INSERT INTO budget_allocations (
  budget_id,
  name,
  allocation_type,
  percentage,
  reference_category_id,
  created_at,
  updated_at
)
SELECT 
  c.budget_id,
  ca.name,
  ca.allocation_type,
  ca.percentage,
  ca.reference_category_id,
  ca.created_at,
  ca.updated_at
FROM category_allocations ca
JOIN categories c ON ca.category_id = c.id;

-- Remove allocation_id from transactions
ALTER TABLE transactions DROP COLUMN IF EXISTS allocation_id;

-- Drop old table
DROP TABLE IF EXISTS category_allocations;