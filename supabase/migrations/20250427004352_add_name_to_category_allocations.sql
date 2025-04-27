ALTER TABLE "public"."category_allocations" ADD COLUMN "name" TEXT;

-- Backfill existing records with default names
UPDATE "public"."category_allocations" 
SET "name" = CASE 
  WHEN "allocation_type" = 'manual' THEN 'Manual Allocation' 
  ELSE 'Dynamic Allocation' 
END
WHERE "name" IS NULL;

-- Make the column required for future records
ALTER TABLE "public"."category_allocations" ALTER COLUMN "name" SET NOT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN "public"."category_allocations"."name" IS 'Human-readable name for the allocation';