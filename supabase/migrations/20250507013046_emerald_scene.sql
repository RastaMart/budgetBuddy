/*
  # Add transaction rules table

  1. New Tables
    - `transaction_rules`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `account_id` (uuid, references accounts)
      - `description` (text)
      - `category_id` (uuid, references categories)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS
    - Add policies for authenticated users
*/

CREATE TABLE transaction_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  description text NOT NULL,
  category_id uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE transaction_rules ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage their own rules"
ON transaction_rules
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create unique constraint to prevent duplicate rules
CREATE UNIQUE INDEX transaction_rules_unique_rule 
ON transaction_rules(user_id, account_id, description);