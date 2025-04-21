/*
  # Fix budget creation and RLS policies

  1. Changes
    - Add trigger to automatically create budget_users entry on budget creation
    - Update RLS policies to properly handle budget creation flow
    
  2. Security
    - Modify INSERT policy to ensure budget creation is secure
    - Add trigger to handle ownership assignment
*/

-- First create the trigger function
CREATE OR REPLACE FUNCTION public.handle_new_budget()
RETURNS TRIGGER AS $$
BEGIN
  -- Create budget_users entry for the creator as owner
  INSERT INTO public.budget_users (budget_id, user_id, role)
  VALUES (NEW.id, auth.uid(), 'owner');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS on_budget_created ON public.budgets;
CREATE TRIGGER on_budget_created
  AFTER INSERT ON public.budgets
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_budget();

-- Update the budget RLS policies
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.budgets;
CREATE POLICY "Enable insert for authenticated users" ON public.budgets
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

NOTIFY pgrst, 'reload schema';