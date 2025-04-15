/*
  # Database Schema Update
  
  1. Tables
    - Safely creates tables if they don't exist
    - Adds RLS policies
    - Sets up trigger for profile creation
  
  2. Security
    - Enables RLS on all tables
    - Creates policies for data access
*/

-- Check and create tables using DO block
DO $$ 
BEGIN
  -- Create tables only if they don't exist
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'profiles') THEN
    CREATE TABLE profiles (
      id UUID PRIMARY KEY REFERENCES auth.users(id),
      email TEXT NOT NULL,
      full_name TEXT,
      avatar_url TEXT,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'households') THEN
    CREATE TABLE households (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'household_members') THEN
    CREATE TABLE household_members (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      household_id UUID REFERENCES households(id) ON DELETE CASCADE,
      profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK (role IN ('owner', 'member', 'child')),
      created_at TIMESTAMPTZ DEFAULT now(),
      UNIQUE(household_id, profile_id)
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'budget_categories') THEN
    CREATE TABLE budget_categories (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      household_id UUID REFERENCES households(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      period TEXT NOT NULL CHECK (period IN ('week', 'month', 'year')),
      type TEXT NOT NULL CHECK (type IN ('personal', 'shared')),
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'budgets') THEN
    CREATE TABLE budgets (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      category_id UUID REFERENCES budget_categories(id) ON DELETE CASCADE,
      amount DECIMAL(10,2) NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'transactions') THEN
    CREATE TABLE transactions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      category_id UUID REFERENCES budget_categories(id) ON DELETE SET NULL,
      profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
      amount DECIMAL(10,2) NOT NULL,
      description TEXT NOT NULL,
      date DATE NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );
  END IF;
END $$;

-- Enable RLS on all tables
DO $$ 
BEGIN
  EXECUTE 'ALTER TABLE profiles ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE households ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE household_members ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE budget_categories ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE budgets ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE transactions ENABLE ROW LEVEL SECURITY';
END $$;

-- Drop existing policies if they exist and create new ones
DO $$ 
BEGIN
  -- Profiles policies
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can read own profile') THEN
    DROP POLICY "Users can read own profile" ON profiles;
  END IF;
  CREATE POLICY "Users can read own profile"
    ON profiles FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own profile') THEN
    DROP POLICY "Users can update own profile" ON profiles;
  END IF;
  CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id);

  -- Households policies
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can read households they belong to') THEN
    DROP POLICY "Users can read households they belong to" ON households;
  END IF;
  CREATE POLICY "Users can read households they belong to"
    ON households FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM household_members
        WHERE household_members.household_id = households.id
        AND household_members.profile_id = auth.uid()
      )
    );

  -- Household members policies
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can read household members of their households') THEN
    DROP POLICY "Users can read household members of their households" ON household_members;
  END IF;
  CREATE POLICY "Users can read household members of their households"
    ON household_members FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM household_members AS my_memberships
        WHERE my_memberships.household_id = household_members.household_id
        AND my_memberships.profile_id = auth.uid()
      )
    );

  -- Budget categories policies
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can read budget categories of their households') THEN
    DROP POLICY "Users can read budget categories of their households" ON budget_categories;
  END IF;
  CREATE POLICY "Users can read budget categories of their households"
    ON budget_categories FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM household_members
        WHERE household_members.household_id = budget_categories.household_id
        AND household_members.profile_id = auth.uid()
      )
    );

  -- Budgets policies
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can read budgets of their households') THEN
    DROP POLICY "Users can read budgets of their households" ON budgets;
  END IF;
  CREATE POLICY "Users can read budgets of their households"
    ON budgets FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM household_members
        JOIN budget_categories ON budget_categories.household_id = household_members.household_id
        WHERE budget_categories.id = budgets.category_id
        AND household_members.profile_id = auth.uid()
      )
    );

  -- Transactions policies
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can read transactions of their households') THEN
    DROP POLICY "Users can read transactions of their households" ON transactions;
  END IF;
  CREATE POLICY "Users can read transactions of their households"
    ON transactions FOR SELECT
    TO authenticated
    USING (
      profile_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM household_members
        JOIN budget_categories ON budget_categories.household_id = household_members.household_id
        WHERE budget_categories.id = transactions.category_id
        AND household_members.profile_id = auth.uid()
      )
    );
END $$;

-- Create or replace the trigger function
CREATE OR REPLACE FUNCTION create_profile_for_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (
    NEW.id,
    (NEW.raw_user_meta_data->>'email')::TEXT,
    (NEW.raw_user_meta_data->>'full_name')::TEXT
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate the trigger
DO $$
BEGIN
  DROP TRIGGER IF EXISTS create_profile_on_signup ON auth.users;
  CREATE TRIGGER create_profile_on_signup
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_profile_for_user();
END $$;