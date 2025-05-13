/*
  # Add wildcard support to transaction auto-categorization

  1. Changes
    - Update auto_categorize_transaction() function to support '*' wildcards in rule descriptions
    - Add index on transaction_rules(description) for better performance
    - Add function to convert wildcards to SQL LIKE patterns
*/

-- Create function to convert wildcard pattern to SQL LIKE pattern
CREATE OR REPLACE FUNCTION convert_wildcard_to_like(pattern text)
RETURNS text
LANGUAGE plpgsql
AS $$
BEGIN
  -- Escape special LIKE characters
  pattern := replace(pattern, '%', '\%');
  pattern := replace(pattern, '_', '\_');
  -- Convert * to %
  pattern := replace(pattern, '*', '%');
  RETURN pattern;
END;
$$;

-- Update auto-categorize function to support wildcards
CREATE OR REPLACE FUNCTION auto_categorize_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  matching_rule RECORD;
BEGIN
  -- Look for a matching rule, handling wildcards
  SELECT category_id INTO matching_rule
  FROM transaction_rules
  WHERE user_id = NEW.user_id
    AND account_id = NEW.account_id
    AND (
      -- Exact match
      description = NEW.description
      OR 
      -- Wildcard match
      (
        description LIKE '%*%' AND 
        NEW.description LIKE convert_wildcard_to_like(description)
      )
    )
  -- Order by exact matches first, then by description length (more specific patterns first)
  ORDER BY 
    CASE WHEN description = NEW.description THEN 0 ELSE 1 END,
    length(description) DESC
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

-- Add index to improve pattern matching performance
CREATE INDEX idx_transaction_rules_description ON transaction_rules(description);