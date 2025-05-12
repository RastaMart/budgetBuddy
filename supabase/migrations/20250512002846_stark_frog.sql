/*
  # Add document store for transaction files

  1. New Tables
    - `user_documents`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `file_name` (text)
      - `file_hash` (text) - For deduplication
      - `file_path` (text) - Storage path
      - `metadata` (jsonb) - File metadata
      - `created_at` (timestamptz)

    - `document_embeddings`
      - `id` (uuid, primary key) 
      - `document_id` (uuid, references user_documents)
      - `embedding` (vector(1536)) - OpenAI embeddings
      - `content` (text) - Text chunk
      - `chunk_index` (int)
      - `created_at` (timestamptz)

  2. Changes
    - Add `document_id` to transactions table
    - Add foreign key constraint
    - Enable RLS
    - Add policies
*/

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create user_documents table
CREATE TABLE user_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_hash text NOT NULL,
  file_path text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, file_hash)
);

-- Create document_embeddings table
CREATE TABLE document_embeddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES user_documents(id) ON DELETE CASCADE,
  embedding vector(1536) NOT NULL,
  content text NOT NULL,
  chunk_index int NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Add document_id to transactions
ALTER TABLE transactions
ADD COLUMN document_id uuid REFERENCES user_documents(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE user_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_embeddings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage their own documents"
ON user_documents
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own embeddings"
ON document_embeddings
FOR ALL
TO authenticated
USING (document_id IN (
  SELECT id FROM user_documents WHERE user_id = auth.uid()
))
WITH CHECK (document_id IN (
  SELECT id FROM user_documents WHERE user_id = auth.uid()
));

-- Create indexes
CREATE INDEX idx_user_documents_user_id ON user_documents(user_id);
CREATE INDEX idx_document_embeddings_document_id ON document_embeddings(document_id);
CREATE INDEX idx_embeddings_vector ON document_embeddings USING ivfflat (embedding vector_cosine_ops);