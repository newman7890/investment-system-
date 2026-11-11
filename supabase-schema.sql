-- ==========================================================
-- BONDCAPITAL PRODUCTION HARDENED SCHEMA (SUPABASE POSTGRESQL)
-- ==========================================================
-- Run this in your Supabase Dashboard:
-- SQL Editor -> New Query -> Paste & Run

-- 1. Helper Function: Verify Administrator Authority
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT (
    coalesce(auth.jwt() ->> 'email', '') = 'newm5811@gmail.com'
  );
$$;

-- 2. Profiles Table (User details, settings, tier, 30-level platform)
CREATE TABLE IF NOT EXISTS public.profiles (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT DEFAULT 'Crypto Investor',
  tier TEXT DEFAULT 'Member',
  theme TEXT DEFAULT 'light',
  advanced_mode BOOLEAN DEFAULT FALSE,
  current_level INT DEFAULT 0,
  level_balance NUMERIC(18, 2) DEFAULT 0.00,
  monthly_limit NUMERIC(18, 2) DEFAULT 0.00,
  api_provider TEXT DEFAULT 'bondcapital',
  api_key TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Balances Table (Real-time wallet holdings with non-negative constraints)
CREATE TABLE IF NOT EXISTS public.balances (
  user_id TEXT PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  usd NUMERIC(18, 2) DEFAULT 0.00,
  btc NUMERIC(18, 8) DEFAULT 0.00000000,
  eth NUMERIC(18, 8) DEFAULT 0.00000000,
  sol NUMERIC(18, 8) DEFAULT 0.00000000,
  doge NUMERIC(18, 8) DEFAULT 0.00000000,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT check_usd_non_negative CHECK (usd >= 0)
);

-- 4. Transactions Table (Persistent execution ledger)
CREATE TABLE IF NOT EXISTS public.transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,          -- 'Buy', 'Sell', 'Send', 'Deposit', 'Withdraw'
  asset TEXT NOT NULL,         -- 'BTC', 'ETH', 'SOL', 'USD', 'DOGE'
  crypto_amount NUMERIC(18, 8) DEFAULT 0,
  usd_amount NUMERIC(18, 2) DEFAULT 0,
  price NUMERIC(18, 2) DEFAULT 0,
  status TEXT DEFAULT 'Completed',
  date TEXT,
  channel TEXT DEFAULT 'Direct Settlement',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT check_usd_amount_non_negative CHECK (usd_amount >= 0)
);

-- 5. Enable Realtime Replication
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.balances;
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;

-- 6. Enable Row Level Security (RLS) on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- 7. Secure Policies for PROFILES
DROP POLICY IF EXISTS "Allow all on profiles" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON public.profiles;

CREATE POLICY "profiles_select_policy" ON public.profiles
  FOR SELECT
  USING (auth.uid()::text = id OR public.is_admin());

CREATE POLICY "profiles_insert_policy" ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid()::text = id OR public.is_admin());

CREATE POLICY "profiles_update_policy" ON public.profiles
  FOR UPDATE
  USING (auth.uid()::text = id OR public.is_admin())
  WITH CHECK (auth.uid()::text = id OR public.is_admin());

CREATE POLICY "profiles_delete_policy" ON public.profiles
  FOR DELETE
  USING (public.is_admin());

-- 8. Secure Policies for BALANCES
DROP POLICY IF EXISTS "Allow all on balances" ON public.balances;
DROP POLICY IF EXISTS "balances_select_policy" ON public.balances;
DROP POLICY IF EXISTS "balances_insert_policy" ON public.balances;
DROP POLICY IF EXISTS "balances_update_policy" ON public.balances;

CREATE POLICY "balances_select_policy" ON public.balances
  FOR SELECT
  USING (auth.uid()::text = user_id OR public.is_admin());

CREATE POLICY "balances_insert_policy" ON public.balances
  FOR INSERT
  WITH CHECK (auth.uid()::text = user_id OR public.is_admin());

CREATE POLICY "balances_update_policy" ON public.balances
  FOR UPDATE
  USING (auth.uid()::text = user_id OR public.is_admin())
  WITH CHECK (auth.uid()::text = user_id OR public.is_admin());

-- 9. Secure Policies for TRANSACTIONS
DROP POLICY IF EXISTS "Allow all on transactions" ON public.transactions;
DROP POLICY IF EXISTS "transactions_select_policy" ON public.transactions;
DROP POLICY IF EXISTS "transactions_insert_policy" ON public.transactions;
DROP POLICY IF EXISTS "transactions_update_policy" ON public.transactions;

CREATE POLICY "transactions_select_policy" ON public.transactions
  FOR SELECT
  USING (auth.uid()::text = user_id OR public.is_admin());

CREATE POLICY "transactions_insert_policy" ON public.transactions
  FOR INSERT
  WITH CHECK (auth.uid()::text = user_id OR public.is_admin());

-- Only the verified administrator can settle, approve, or reject transactions
CREATE POLICY "transactions_update_policy" ON public.transactions
  FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
