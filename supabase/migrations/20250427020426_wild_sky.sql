/*
  # Add shared amount and allocation reference to categories
  
  1. Changes
    - Add shared_amount column to store the total amount for shared income categories
    - Add allocation_id to link categories with their budget allocations
    - Add foreign key constraint to reference budget_allocations table
  
  2. Security
    - No changes to RLS policies needed
*/

ALTER TABLE categories 
ADD COLUMN shared_amount numeric(10,2),
ADD COLUMN allocation_id uuid REFERENCES budget_allocations(id) ON DELETE SET NULL;