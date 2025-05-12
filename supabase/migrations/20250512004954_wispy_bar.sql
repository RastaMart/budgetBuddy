/*
  # Add user documents table

  1. New Tables
    - `user_documents`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `file_name` (text)
      - `file_hash` (text)
      - `file_path` (text)
      - `metadata` (jsonb)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS
    - Add policies for authenticated users
    - Create unique constraint on user_id + file_hash
*/

CREATE TABLE user_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_hash text NOT NULL,
  file_path text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_documents ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage their own documents"
ON user_documents
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_user_documents_user_id ON user_documents(user_id);
CREATE UNIQUE INDEX user_documents_user_id_file_hash_key ON user_documents(user_id, file_hash);

-- Add foreign key to transactions table
ALTER TABLE transactions
ADD COLUMN document_id uuid REFERENCES user_documents(id) ON DELETE SET NULL;