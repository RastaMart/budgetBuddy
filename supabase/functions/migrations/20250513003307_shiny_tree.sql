/*
  # Create storage bucket for CSV uploads

  1. New Tables
    - Create storage bucket for CSV uploads
    - Add user_documents table for tracking uploaded files

  2. Security
    - Enable RLS on storage bucket
    - Create storage policies for authenticated users
    - Create RLS policies for user_documents table

  3. Changes
    - Add document_id to transactions table
    - Add foreign key constraint
*/

-- Create user_documents table
CREATE TABLE IF NOT EXISTS user_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_hash text NOT NULL,
  file_path text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create unique constraint to prevent duplicate uploads
CREATE UNIQUE INDEX IF NOT EXISTS user_documents_user_id_file_hash_key 
ON user_documents(user_id, file_hash);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_documents_user_id 
ON user_documents(user_id);

-- Add document_id to transactions
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS document_id uuid REFERENCES user_documents(id) ON DELETE SET NULL;

-- Enable RLS on user_documents
ALTER TABLE user_documents ENABLE ROW LEVEL SECURITY;

-- Create policies for user_documents
DROP POLICY IF EXISTS "Users can insert their own documents" ON user_documents;
DROP POLICY IF EXISTS "Users can view their own documents" ON user_documents;
DROP POLICY IF EXISTS "Users can update their own documents" ON user_documents;
DROP POLICY IF EXISTS "Users can delete their own documents" ON user_documents;

CREATE POLICY "Users can insert their own documents"
ON user_documents FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own documents"
ON user_documents FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own documents"
ON user_documents FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own documents"
ON user_documents FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- Create storage bucket for CSV uploads
INSERT INTO storage.buckets (id, name)
VALUES ('csv-uploads', 'csv-uploads')
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create storage policies

DROP POLICY IF EXISTS "Authenticated users can upload files" ON storage.objects;
CREATE POLICY "Authenticated users can upload files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'csv-uploads' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can view their own files" ON storage.objects;
CREATE POLICY "Users can view their own files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'csv-uploads' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can update their own files" ON storage.objects;
CREATE POLICY "Users can update their own files"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'csv-uploads' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can delete their own files" ON storage.objects;
CREATE POLICY "Users can delete their own files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'csv-uploads' AND
  auth.uid()::text = (storage.foldername(name))[1]
);