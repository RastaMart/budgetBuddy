/*
  # Enable RLS for user_documents table

  1. Security Changes
    - Enable Row Level Security on user_documents table
    - Add policies for authenticated users to:
      - Insert their own documents
      - Read their own documents
      - Update their own documents
      - Delete their own documents
    
  2. Notes
    - All operations are restricted to documents where user_id matches the authenticated user's ID
    - Policies ensure users can only manage their own documents
*/

-- Enable RLS
ALTER TABLE user_documents ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can insert their own documents"
ON user_documents
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own documents"
ON user_documents
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own documents"
ON user_documents
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own documents"
ON user_documents
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);