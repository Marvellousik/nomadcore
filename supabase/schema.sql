-- NomadCore Supabase Schema (Aligned with actual project schema)
-- Your actual schema uses SERIAL (integer) IDs.
-- Run the ALTER TABLE statements below if you want the dashboard AI + overflow bus features to work fully.

-- 1. Routes Table
CREATE TABLE IF NOT EXISTS public.routes (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  price INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Bookings Table
CREATE TABLE IF NOT EXISTS public.bookings (
  id SERIAL PRIMARY KEY,
  ticket_code TEXT UNIQUE NOT NULL,
  phone_number TEXT NOT NULL,
  route_id INTEGER REFERENCES public.routes(id),
  session_id TEXT,
  status TEXT DEFAULT 'confirmed',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Add missing columns for dashboard analytics & admin controls
ALTER TABLE public.routes
ADD COLUMN IF NOT EXISTS origin TEXT,
ADD COLUMN IF NOT EXISTS destination TEXT,
ADD COLUMN IF NOT EXISTS available_seats INTEGER DEFAULT 0;

-- 4. Enable Row Level Security
ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- 5. Policies for Anonymous Access (USSD & Dashboard reads)
CREATE POLICY IF NOT EXISTS "Allow public read access on routes"
  ON public.routes FOR SELECT
  TO anon
  USING (true);

CREATE POLICY IF NOT EXISTS "Allow public read access on bookings"
  ON public.bookings FOR SELECT
  TO anon
  USING (true);

CREATE POLICY IF NOT EXISTS "Allow public insert on bookings"
  ON public.bookings FOR INSERT
  TO anon
  WITH CHECK (true);

-- 6. Policies for Service Role (Server Actions / API routes)
CREATE POLICY IF NOT EXISTS "Allow service role all on routes"
  ON public.routes FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Allow service role all on bookings"
  ON public.bookings FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 7. Enable Realtime on bookings table
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;

-- 8. Seed data (update origin/destination/available_seats to match your actual routes)
INSERT INTO public.routes (name, price) VALUES 
('Lagos - Ibadan', 5000),
('Abuja - Kaduna', 4000),
('Port Harcourt - Aba', 3000)
ON CONFLICT DO NOTHING;
