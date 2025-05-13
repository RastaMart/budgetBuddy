/*
  # Add auto-categorization trigger

  1. New Functions
    - `auto_categorize_transaction()`
      - Checks transaction_rules table for matching rule
      - Updates transaction with category_id if rule found

  2. New Triggers
    - `transaction_after_insert`
      - Fires after INSERT on transactions table
      - Calls auto_categorize_transaction() function

  3. Security
    - Function runs with SECURITY DEFINER to access rules table
*/

-- Create function to auto-categorize transactions
CREATE OR REPLACE FUNCTION auto_categorize_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  matching_rule RECORD;
BEGIN
  -- Look for a matching rule
  SELECT category_id INTO matching_rule
  FROM transaction_rules
  WHERE user_id = NEW.user_id
    AND account_id = NEW.account_id
    AND description = NEW.description
  LIMIT 1;

  -- If a matching rule is found, update the transaction
  IF FOUND THEN
    UPDATE transactions
    SET category_id = matching_rule.category_id
    WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger to auto-categorize after insert
CREATE TRIGGER transaction_after_insert
  AFTER INSERT ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION auto_categorize_transaction();