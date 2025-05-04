-- Create cron schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS cron;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create table to log scheduled executions
CREATE TABLE scheduled_execution_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name text NOT NULL,
  status text NOT NULL,
  details jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on logs table
ALTER TABLE scheduled_execution_logs ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authenticated users to view logs
CREATE POLICY "Allow authenticated users to view logs"
  ON scheduled_execution_logs
  FOR SELECT
  TO authenticated
  USING (true);

-- Function to distribute funds for a single category
CREATE OR REPLACE FUNCTION distribute_funds_for_category(category_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_budget_id uuid;
  v_edge_function_url text;
  v_result int;
BEGIN
  -- Get the budget_id for the category
  SELECT budget_id INTO v_budget_id
  FROM categories
  WHERE id = category_id;

  -- Call the edge function using pg_net extension
  SELECT status INTO v_result
  FROM net.http_post(
    url := rtrim(current_setting('app.settings.supabase_url'), '/') || '/functions/v1/distribute-funds',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := jsonb_build_object(
      'budgetId', v_budget_id,
      'categoryId', category_id
    )
  );

  -- Log the result
  INSERT INTO scheduled_execution_logs (function_name, status, details)
  VALUES (
    'distribute_funds_for_category',
    CASE WHEN v_result = 200 THEN 'success' ELSE 'error' END,
    jsonb_build_object(
      'category_id', category_id,
      'http_status', v_result
    )
  );
END;
$$;

-- Function to distribute funds for all income categories
CREATE OR REPLACE FUNCTION distribute_all_funds()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  r RECORD;
BEGIN
  -- Log start of execution
  INSERT INTO scheduled_execution_logs (function_name, status, details)
  VALUES (
    'distribute_all_funds',
    'started',
    jsonb_build_object('timestamp', now())
  );

  -- Iterate through all income categories
  FOR r IN 
    SELECT id 
    FROM categories 
    WHERE type IN ('income', 'shared_income')
  LOOP
    -- Distribute funds for each category
    PERFORM distribute_funds_for_category(r.id);
  END LOOP;

  -- Log completion
  INSERT INTO scheduled_execution_logs (function_name, status, details)
  VALUES (
    'distribute_all_funds',
    'completed',
    jsonb_build_object('timestamp', now())
  );
END;
$$;

-- Create the cron.job table if it doesn't exist
CREATE TABLE IF NOT EXISTS cron.job (
  jobid bigserial PRIMARY KEY,
  schedule text NOT NULL,
  command text NOT NULL,
  nodename text NOT NULL,
  nodeport integer NOT NULL,
  database text NOT NULL,
  username text NOT NULL,
  active boolean NOT NULL DEFAULT true
);

-- Create the scheduled task to run at 4am UTC
INSERT INTO cron.job (schedule, command, nodename, nodeport, database, username)
VALUES (
  '0 4 * * *',
  'SELECT distribute_all_funds()',
  'localhost',
  5432,
  'postgres',
  'postgres'
);