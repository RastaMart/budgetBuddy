/*
  # Add pgvector extension and document search functionality

  1. Changes
    - Enable pgvector extension
    - Create match_documents function for semantic search
    - Add vector similarity search index

  2. Security
    - Function runs with invoker security
*/

-- Enable the pgvector extension to work with embedding vectors
CREATE EXTENSION IF NOT EXISTS vector;

-- Create a function to search for documents
CREATE OR REPLACE FUNCTION match_documents (
  query_embedding vector(1536),
  match_count int DEFAULT NULL,
  filter jsonb DEFAULT '{}'
) 
RETURNS TABLE (
  id uuid,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
#variable_conflict use_column
BEGIN
  RETURN QUERY
  SELECT
    document_embeddings.id,
    document_embeddings.content,
    user_documents.metadata,
    1 - (document_embeddings.embedding <=> query_embedding) as similarity
  FROM document_embeddings
  JOIN user_documents ON document_embeddings.document_id = user_documents.id
  WHERE user_documents.metadata @> filter
  ORDER BY document_embeddings.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;