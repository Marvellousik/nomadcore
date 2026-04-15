-- NomadCore Supabase Schema — Smart Seat-Managed Booking System
-- Minimal hackathon-ready schema. No new tables; existing tables extended.

-- ========================================
-- 1. ROUTES TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS public.routes (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  origin TEXT,
  destination TEXT,
  base_price INTEGER NOT NULL,
  total_seats INTEGER NOT NULL DEFAULT 12,
  departure_time TEXT,                -- e.g., "08:00 AM", "02:00 PM"
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- 2. BOOKINGS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS public.bookings (
  id SERIAL PRIMARY KEY,
  ticket_code TEXT UNIQUE NOT NULL,
  phone_number TEXT NOT NULL,
  route_id INTEGER REFERENCES public.routes(id),
  session_id TEXT NOT NULL,

  -- Lifecycle status: pending → confirmed or expired
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'expired')),

  -- Mock payment fields
  payment_bank TEXT,
  payment_account TEXT,
  payment_reference TEXT,
  payment_expires_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- 3. INDEXES (critical for USSD <10s performance)
-- ========================================
CREATE INDEX IF NOT EXISTS idx_bookings_route_status
  ON public.bookings(route_id, status);

CREATE INDEX IF NOT EXISTS idx_bookings_phone
  ON public.bookings(phone_number, created_at DESC);

-- ========================================
-- 4. RPC: Single-round-trip route availability
-- ========================================
CREATE OR REPLACE FUNCTION get_routes_with_availability()
RETURNS TABLE (
  id INTEGER,
  name TEXT,
  base_price INTEGER,
  total_seats INTEGER,
  departure_time TEXT,
  booked_seats BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.name,
    r.base_price,
    r.total_seats,
    r.departure_time,
    COUNT(b.id) FILTER (WHERE b.status IN ('pending','confirmed')) AS booked_seats
  FROM public.routes r
  LEFT JOIN public.bookings b 
    ON b.route_id = r.id AND b.status IN ('pending','confirmed')
  GROUP BY r.id
  ORDER BY r.name;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 5. Enable Row Level Security
-- ========================================
ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- ========================================
-- 6. Policies for Anonymous Access (USSD reads + insert)
-- ========================================
DO $$
BEGIN
  -- routes select
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'routes' AND policyname = 'Allow public read access on routes'
  ) THEN
    CREATE POLICY "Allow public read access on routes"
      ON public.routes FOR SELECT
      TO anon
      USING (true);
  END IF;

  -- bookings select
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'bookings' AND policyname = 'Allow public read access on bookings'
  ) THEN
    CREATE POLICY "Allow public read access on bookings"
      ON public.bookings FOR SELECT
      TO anon
      USING (true);
  END IF;

  -- bookings insert
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'bookings' AND policyname = 'Allow public insert on bookings'
  ) THEN
    CREATE POLICY "Allow public insert on bookings"
      ON public.bookings FOR INSERT
      TO anon
      WITH CHECK (true);
  END IF;
END
$$;

-- ========================================
-- 7. Policies for Service Role (Server Actions / API routes)
-- ========================================
DO $$
BEGIN
  -- routes service role
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'routes' AND policyname = 'Allow service role all on routes'
  ) THEN
    CREATE POLICY "Allow service role all on routes"
      ON public.routes FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;

  -- bookings service role
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'bookings' AND policyname = 'Allow service role all on bookings'
  ) THEN
    CREATE POLICY "Allow service role all on bookings"
      ON public.bookings FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END
$$;

-- ========================================
-- 8. Enable Realtime on bookings table
-- ========================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'bookings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
  END IF;
END
$$;

-- ========================================
-- 9. Seed data (aligned with current demo routes)
-- ========================================
INSERT INTO public.routes (name, origin, destination, base_price, total_seats, departure_time) VALUES 
('Lagos - Ibadan', 'Lagos', 'Ibadan', 5000, 12, '08:00 AM'),
('Abuja - Kaduna', 'Abuja', 'Kaduna', 4000, 12, '02:00 PM'),
('Port Harcourt - Aba', 'Port Harcourt', 'Aba', 3000, 12, '06:00 PM')
ON CONFLICT DO NOTHING;
