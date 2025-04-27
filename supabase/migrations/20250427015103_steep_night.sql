/*
  # Update budget allocations system
  
  1. Changes
    - Safely handle existing budget_allocations table
    - Migrate data from category_allocations
    - Clean up old structures
  
  2. Security
    - Maintain RLS policies
*/

-- Only create the table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'budget_allocations') THEN
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
  END IF;
END $$;

-- Migrate existing data if category_allocations exists
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'category_allocations') THEN
    INSERT INTO budget_allocations (
      budget_id,
      name,
      allocation_type,
      percentage,
      reference_category_id,
      created_at,
      updated_at
    )
    SELECT DISTINCT ON (c.budget_id, ca.name)
      c.budget_id,
      ca.name,
      ca.allocation_type,
      ca.percentage,
      ca.reference_category_id,
      ca.created_at,
      ca.updated_at
    FROM category_allocations ca
    JOIN categories c ON ca.category_id = c.id
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- Remove allocation_id from transactions if it exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'transactions' 
    AND column_name = 'allocation_id'
  ) THEN
    ALTER TABLE transactions DROP COLUMN allocation_id;
  END IF;
END $$;

-- Drop category_allocations if it exists
DROP TABLE IF EXISTS category_allocations;