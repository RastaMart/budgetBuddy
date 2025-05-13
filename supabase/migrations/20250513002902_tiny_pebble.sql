/*
  # Set up storage and document handling

  1. Storage Setup
    - Create csv-uploads bucket
    - Enable RLS on bucket
    - Add storage policies for authenticated users

  2. User Documents Table
    - Enable RLS
    - Add policies for CRUD operations
*/

-- Create storage bucket for CSV uploads
INSERT INTO storage.buckets (id, name)
VALUES ('csv-uploads', 'csv-uploads');

-- Enable RLS on the bucket
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create storage policies
CREATE POLICY "Authenticated users can upload files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'csv-uploads' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'csv-uploads' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own files"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'csv-uploads' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'csv-uploads' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Enable RLS on user_documents table
ALTER TABLE user_documents ENABLE ROW LEVEL SECURITY;

-- Create policies for user_documents table
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