-- ==========================================================
-- COINBASE INVESTMENT SYSTEM - SUPABASE DATABASE SCHEMA
-- ==========================================================
-- Run this script in your Supabase SQL Editor:
-- Dashboard -> SQL Editor -> New query -> Paste and click Run.

-- 1. Profiles Table (User details, Verification tier)
CREATE TABLE IF NOT EXISTS public.profiles (
  id TEXT PRIMARY KEY DEFAULT 'primary_user',
  name TEXT DEFAULT 'Chris Wong',
  email TEXT DEFAULT 'chris.wong@example.com',
  tier TEXT DEFAULT 'Level 3 Verified',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Balances Table (Fiat and Crypto Holdings)
CREATE TABLE IF NOT EXISTS public.balances (
  id TEXT PRIMARY KEY DEFAULT 'user_wallet',
  usd NUMERIC(16, 2) DEFAULT 10000.00,
  btc NUMERIC(16, 8) DEFAULT 0.15,
  eth NUMERIC(16, 8) DEFAULT 1.50,
  sol NUMERIC(16, 8) DEFAULT 12.00,
  doge NUMERIC(16, 8) DEFAULT 0.00,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Transactions Table (Full Order Ledger)
CREATE TABLE IF NOT EXISTS public.transactions (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,         -- 'Buy', 'Sell', 'Send', 'Deposit', 'Withdraw'
  asset TEXT NOT NULL,        -- 'BTC', 'ETH', 'SOL', 'USD', etc.
  crypto_amount NUMERIC(18, 8) DEFAULT 0,
  usd_amount NUMERIC(16, 2) DEFAULT 0,
  price NUMERIC(16, 2) DEFAULT 0,
  date TEXT,
  status TEXT DEFAULT 'Completed',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS) & Allow Public / Anon Access for Web Client
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Create Permissive Policies for Anon/Public Client
DROP POLICY IF EXISTS "Allow anon all on profiles" ON public.profiles;
CREATE POLICY "Allow anon all on profiles" ON public.profiles FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon all on balances" ON public.balances;
CREATE POLICY "Allow anon all on balances" ON public.balances FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon all on transactions" ON public.transactions;
CREATE POLICY "Allow anon all on transactions" ON public.transactions FOR ALL USING (true) WITH CHECK (true);

-- Insert Default Seed Records (if not already existing)
INSERT INTO public.profiles (id, name, email, tier)
VALUES ('primary_user', 'Chris Wong', 'chris.wong@example.com', 'Level 3 Verified')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.balances (id, usd, btc, eth, sol, doge)
VALUES ('user_wallet', 10000.00, 0.15, 1.50, 12.00, 0.00)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.transactions (id, type, asset, crypto_amount, usd_amount, price, date, status)
VALUES
  ('TX-9042', 'Buy', 'BTC', 0.05, 4590.20, 91804.00, 'Oct 30, 2026, 09:14 AM', 'Completed'),
  ('TX-8821', 'Buy', 'ETH', 1.00, 3350.00, 3350.00, 'Oct 28, 2026, 02:45 PM', 'Completed'),
  ('TX-7640', 'Deposit', 'USD', 0, 10000.00, 1.00, 'Oct 25, 2026, 11:30 AM', 'Completed')
ON CONFLICT (id) DO NOTHING;
