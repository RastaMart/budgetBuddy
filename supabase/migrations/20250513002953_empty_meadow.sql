-- Drop existing policies
DROP POLICY IF EXISTS "Users can insert their own documents" ON user_documents;
DROP POLICY IF EXISTS "Users can view their own documents" ON user_documents;
DROP POLICY IF EXISTS "Users can update their own documents" ON user_documents;
DROP POLICY IF EXISTS "Users can delete their own documents" ON user_documents;

-- Recreate policies
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