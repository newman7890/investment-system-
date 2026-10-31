-- ==========================================================
-- NEXUSPRO REAL BACKEND SCHEMA (SUPABASE POSTGRESQL) - CLEAN REBUILD
-- ==========================================================
-- Run this in your Supabase Dashboard:
-- SQL Editor -> New Query -> Paste & Run

-- 1. Drop existing tables to ensure clean schema update
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.balances CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- 2. Profiles Table (User details, settings, tier, 30-level platform)
CREATE TABLE public.profiles (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT DEFAULT 'Crypto Investor',
  tier TEXT DEFAULT 'Level 3 Verified',
  theme TEXT DEFAULT 'light',
  advanced_mode BOOLEAN DEFAULT FALSE,
  current_level INT DEFAULT 1,
  level_balance NUMERIC(18, 2) DEFAULT 1500.00,
  monthly_limit NUMERIC(18, 2) DEFAULT 30.00,
  api_provider TEXT DEFAULT 'bondcapital',
  api_key TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Balances Table (Real-time wallet holdings)
CREATE TABLE public.balances (
  user_id TEXT PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  usd NUMERIC(18, 2) DEFAULT 10000.00,
  btc NUMERIC(18, 8) DEFAULT 0.15000000,
  eth NUMERIC(18, 8) DEFAULT 1.50000000,
  sol NUMERIC(18, 8) DEFAULT 12.00000000,
  doge NUMERIC(18, 8) DEFAULT 0.00000000,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Transactions Table (Persistent execution ledger)
CREATE TABLE public.transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,          -- 'Buy', 'Sell', 'Send', 'Deposit', 'Withdraw'
  asset TEXT NOT NULL,         -- 'BTC', 'ETH', 'SOL', 'USD', 'DOGE'
  crypto_amount NUMERIC(18, 8) DEFAULT 0,
  usd_amount NUMERIC(18, 2) DEFAULT 0,
  price NUMERIC(18, 2) DEFAULT 0,
  status TEXT DEFAULT 'Completed',
  date TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Enable Realtime Replication
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.balances;
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;

-- 6. Row Level Security & Public Client Access
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all on profiles" ON public.profiles;
CREATE POLICY "Allow all on profiles" ON public.profiles FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on balances" ON public.balances;
CREATE POLICY "Allow all on balances" ON public.balances FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on transactions" ON public.transactions;
CREATE POLICY "Allow all on transactions" ON public.transactions FOR ALL USING (true) WITH CHECK (true);

-- 7. Insert Primary Default User Record
INSERT INTO public.profiles (id, email, name, tier, theme, advanced_mode, current_level, level_balance, monthly_limit)
VALUES ('usr_master_chris', 'chris.wong@example.com', 'Chris Wong', 'Level 3 Verified', 'light', false, 1, 1500.00, 30.00);

INSERT INTO public.balances (user_id, usd, btc, eth, sol, doge)
VALUES ('usr_master_chris', 10000.00, 0.15000000, 1.50000000, 12.00000000, 0.00000000);

INSERT INTO public.transactions (id, user_id, type, asset, crypto_amount, usd_amount, price, date, status)
VALUES
  ('TX-9042', 'usr_master_chris', 'Buy', 'BTC', 0.05, 4590.20, 91804.00, 'Oct 30, 2026, 09:14 AM', 'Completed'),
  ('TX-8821', 'usr_master_chris', 'Buy', 'ETH', 1.00, 3350.00, 3350.00, 'Oct 28, 2026, 02:45 PM', 'Completed'),
  ('TX-7640', 'usr_master_chris', 'Deposit', 'USD', 0, 10000.00, 1.00, 'Oct 25, 2026, 11:30 AM', 'Completed');
