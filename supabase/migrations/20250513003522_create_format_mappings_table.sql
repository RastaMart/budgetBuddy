-- Create format_mappings table for storing CSV format signatures and their mappings
CREATE TABLE IF NOT EXISTS format_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  format_signature TEXT NOT NULL UNIQUE,
  format_mapping JSONB NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE,
  usage_count INTEGER NOT NULL DEFAULT 1,
  
  -- Add search indexing for format signatures
  CONSTRAINT format_signature_not_empty CHECK (char_length(format_signature) > 0)
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS format_mappings_signature_idx ON format_mappings(format_signature);
CREATE INDEX IF NOT EXISTS format_mappings_created_by_idx ON format_mappings(created_by);
CREATE INDEX IF NOT EXISTS format_mappings_usage_count_idx ON format_mappings(usage_count DESC);

-- Set up RLS (Row Level Security)
ALTER TABLE format_mappings ENABLE ROW LEVEL SECURITY;

-- Create policies for access control
-- Users can see their own format mappings and popular public ones
CREATE POLICY "Users can view their own format mappings" 
  ON format_mappings 
  FOR SELECT 
  USING (auth.uid() = created_by);

-- Allow users to insert their own format mappings
CREATE POLICY "Users can insert their own format mappings" 
  ON format_mappings 
  FOR INSERT 
  WITH CHECK (auth.uid() = created_by);

-- Allow users to update their own format mappings
CREATE POLICY "Users can update their own format mappings" 
  ON format_mappings 
  FOR UPDATE 
  USING (auth.uid() = created_by);

-- Allow users to delete their own format mappings
CREATE POLICY "Users can delete their own format mappings" 
  ON format_mappings 
  FOR DELETE 
  USING (auth.uid() = created_by);

-- Service function to get popular format mappings (accessible to all authenticated users)
CREATE OR REPLACE FUNCTION get_popular_format_mappings(limit_count INTEGER DEFAULT 10)
RETURNS SETOF format_mappings
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT * FROM format_mappings
  ORDER BY usage_count DESC
  LIMIT limit_count;
$$;

-- Grant access to the function for authenticated users
GRANT EXECUTE ON FUNCTION get_popular_format_mappings TO authenticated;

-- Comment on table and columns for better documentation
COMMENT ON TABLE format_mappings IS 'Stores CSV format signatures and their mappings for improved CSV processing';
COMMENT ON COLUMN format_mappings.format_signature IS 'Unique signature identifying this CSV format';
COMMENT ON COLUMN format_mappings.format_mapping IS 'JSON mapping configuration for this CSV format';
COMMENT ON COLUMN format_mappings.created_by IS 'User who created/owns this format mapping';
COMMENT ON COLUMN format_mappings.usage_count IS 'Number of times this format has been used successfully';
