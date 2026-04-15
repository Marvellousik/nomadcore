# 🚀 NomadCore

**NomadCore** is a next-generation public transport booking platform built for the African market. It combines a **USSD booking interface** (via Africa's Talking) for feature-phone users with a futuristic **Admin Command Center** dashboard for real-time telemetry, analytics, and AI-driven route insights.

## 🏗️ Project Structure

```
app/
├── api/ussd/route.ts      # Africa's Talking USSD webhook handler
├── layout.tsx             # Root layout with Geist fonts
├── page.tsx               # NomadCore Command Dashboard
├── globals.css            # Tailwind CSS v4 setup
lib/
├── analytics.ts           # Dashboard analytics & AI insight engine
├── mockData.ts            # Mock routes & bookings for demo/testing
├── supabase.ts            # Supabase client configuration
```

## 🧩 What It Does

### 1. USSD Booking (Africa's Talking)
Users dial a USSD code to:
- Browse available bus routes
- Book a ticket (saves to Supabase `bookings` table)
- Receive an SMS confirmation with their ticket code

### 2. Admin Dashboard (`/`)
A futuristic, dark-themed Command Center displaying:
- **Total Grid Bookings** — live count of confirmed bookings
- **Projected Revenue** — total revenue from confirmed tickets
- **Optimal Route** — the most popular route with active signals
- **AI Insight Alert** — a "smart" recommendation suggesting price surges or overflow buses based on demand patterns

## 🛠️ Tech Stack

- **Framework:** Next.js 16.2.3 (App Router)
- **UI:** React 19 + Tailwind CSS v4
- **Database:** Supabase (PostgreSQL + Realtime)
- **SMS/USSD:** Africa's Talking SDK
- **Fonts:** Geist (Sans + Mono)

## ⚡ Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the dashboard.

The USSD webhook is available at `POST /api/ussd`.

---

## 📋 Extra Things That Need To Be Done

### 1. Supabase Setup
- [ ] Create a Supabase project
- [ ] Create the `routes` table with columns:
  - `id` (uuid or text, primary key)
  - `name` (text, e.g. "Lagos → Abuja")
  - `origin` (text)
  - `destination` (text)
  - `price` (integer)
  - `available_seats` (integer)
- [ ] Create the `bookings` table with columns:
  - `id` (uuid, primary key, default: gen_random_uuid())
  - `ticket_code` (text)
  - `phone_number` (text)
  - `route_id` (foreign key → routes.id)
  - `session_id` (text)
  - `status` (text: "confirmed" | "cancelled")
  - `created_at` (timestamptz, default: now())
- [ ] Enable **Row Level Security (RLS)** and set appropriate policies
- [ ] Enable **Realtime** on the `bookings` table so the dashboard updates live

### 2. Environment Variables
Update `.env.local` with the following:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Africa's Talking
AFRICASTALKING_API_KEY=your-at-api-key
AFRICASTALKING_USERNAME=your-at-username
```

### 3. Dashboard → Live Data
- [ ] Replace `mockData.ts` imports in `app/page.tsx` with real Supabase fetches
- [ ] Implement **Supabase Realtime** subscriptions so metrics update instantly when new bookings arrive via USSD
- [ ] Add loading & error states for the dashboard

### 4. Admin Controls
- [ ] Add "Update Price" input + button for each route
- [ ] Add "Schedule Overflow Bus" action button
- [ ] Wire the **Execute Surge Protocol** button to actually update route prices in the database

### 5. Schema Alignment
- [ ] **Critical:** The USSD route (`app/api/ussd/route.ts`) references `route.name`, but `lib/mockData.ts` uses `origin` + `destination`. Decide on the final schema and keep both the USSD handler and mock data in sync.

### 6. Testing & Hardening
- [ ] Test the USSD flow end-to-end with Africa's Talking sandbox
- [ ] Handle edge cases: sold-out routes, duplicate bookings, invalid inputs
- [ ] Add basic input validation and rate limiting to the USSD API

### 7. Deployment
- [ ] Deploy to Vercel (or your preferred host)
- [ ] Configure Africa's Talking webhook URL to point to `https://yourdomain.com/api/ussd`
