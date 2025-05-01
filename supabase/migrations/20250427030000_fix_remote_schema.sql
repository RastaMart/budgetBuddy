/*
  # Fix remote_schema migration error

  This migration addresses the error in the remote_schema migration
  by using CASCADE to properly drop the function and its dependencies.
*/

-- Use CASCADE to drop the function and its dependencies
DROP FUNCTION IF EXISTS "storage"."get_level"(name text) CASCADE;

-- Drop any remaining prefixes tables if they exist
DROP TABLE IF EXISTS "storage"."prefixes" CASCADE;

-- Ensure the level column is dropped from objects table if it exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'storage' 
    AND table_name = 'objects' 
    AND column_name = 'level'
  ) THEN
    ALTER TABLE "storage"."objects" DROP COLUMN "level";
  END IF;
END $$;
