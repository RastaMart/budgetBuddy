/*
  # Update auto-categorization function with wildcard support

  1. Changes
    - Update auto_categorize_transaction function to:
      - Support both exact matches and wildcard patterns
      - Prioritize exact matches over wildcard matches
      - Order wildcard matches by length for more specific matching
*/

-- Update auto-categorize function to support wildcards
CREATE OR REPLACE FUNCTION public.auto_categorize_transaction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
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
  IF matching_rule IS NOT NULL THEN
    UPDATE transactions
    SET category_id = matching_rule.category_id
    WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$function$;