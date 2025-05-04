/*
  # Add accounts table and link to transactions

  1. New Tables
    - `accounts`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `name` (text)
      - `identifier` (text)
      - `type` (text: 'bank' or 'credit')
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Changes
    - Add `account_id` to transactions table
    - Add foreign key constraint
    
  3. Security
    - Enable RLS on accounts table
    - Add policies for authenticated users
*/

-- Create accounts table
CREATE TABLE accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  identifier text NOT NULL,
  type text NOT NULL CHECK (type IN ('bank', 'credit')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage their own accounts"
ON accounts
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Add account_id to transactions
ALTER TABLE transactions
ADD COLUMN account_id uuid REFERENCES accounts(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX idx_transactions_account_id ON transactions(account_id);
CREATE INDEX idx_accounts_user_id ON accounts(user_id);