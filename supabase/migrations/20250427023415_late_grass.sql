/*
  # Add display_order to budgets table

  1. Changes
    - Add display_order column to budgets table
    - Set initial display_order values based on creation date
*/

-- Add display_order column
ALTER TABLE budgets 
ADD COLUMN IF NOT EXISTS display_order integer;

-- Set initial display_order values based on creation date
DO $$
BEGIN
  WITH numbered_budgets AS (
    SELECT 
      id,
      ROW_NUMBER() OVER (ORDER BY created_at) - 1 as row_num
    FROM budgets
  )
  UPDATE budgets b
  SET display_order = nb.row_num
  FROM numbered_budgets nb
  WHERE b.id = nb.id;
END $$;

-- Make display_order NOT NULL after setting initial values
ALTER TABLE budgets 
ALTER COLUMN display_order SET NOT NULL;

-- Add index for faster ordering queries
CREATE INDEX IF NOT EXISTS idx_budgets_display_order 
ON budgets(display_order);