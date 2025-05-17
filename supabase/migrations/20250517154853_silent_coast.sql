/*
  # Set up PDF storage bucket and policies

  1. Storage Setup
    - Create pdf-uploads bucket
    - Enable RLS
    - Set up storage policies for secure access

  2. Security
    - Add policies for authenticated users to manage their PDFs
    - Ensure proper access control
*/

-- Create PDF uploads bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('pdf-uploads', 'pdf-uploads', false)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create policies for pdf-uploads bucket
DO $$
BEGIN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Users can upload PDFs" ON storage.objects;
    DROP POLICY IF EXISTS "Users can update their PDFs" ON storage.objects;
    DROP POLICY IF EXISTS "Users can read their PDFs" ON storage.objects;
    DROP POLICY IF EXISTS "Users can delete their PDFs" ON storage.objects;
END $$;

-- Create new policies
CREATE POLICY "Users can upload PDFs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'pdf-uploads' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update their PDFs"
ON storage.objects FOR UPDATE TO authenticated
USING (
    bucket_id = 'pdf-uploads' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can read their PDFs"
ON storage.objects FOR SELECT TO authenticated
USING (
    bucket_id = 'pdf-uploads' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their PDFs"
ON storage.objects FOR DELETE TO authenticated
USING (
    bucket_id = 'pdf-uploads' AND
    (storage.foldername(name))[1] = auth.uid()::text
);