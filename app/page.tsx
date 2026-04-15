'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  getTotalBookings,
  getTotalRevenue,
  getMostPopularRoute,
  generateAIInsight,
} from '../lib/analytics';
import {
  updateRoutePrice,
  applySurgeProtocol,
  scheduleOverflowBus,
} from '../lib/actions';
import type { Route, Booking } from '../lib/mockData';

export default function Dashboard() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [surging, setSurging] = useState(false);

  async function refreshRoutes() {
    const { data } = await supabase.from('routes').select('*').order('name');
    if (data) setRoutes(data);
  }

  useEffect(() => {
    async function fetchData() {
      try {
        const [{ data: routesData, error: routesError }, { data: bookingsData, error: bookingsError }] =
          await Promise.all([
            supabase.from('routes').select('*').order('name'),
            supabase.from('bookings').select('*').order('created_at', { ascending: false }),
          ]);

        if (routesError) throw routesError;
        if (bookingsError) throw bookingsError;

        setRoutes(routesData || []);
        setBookings(bookingsData || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchData();

    const channel = supabase
      .channel('bookings_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings' },
        (payload) => {
          setBookings((prev) => {
            if (payload.eventType === 'INSERT') {
              return [payload.new as Booking, ...prev];
            }
            if (payload.eventType === 'UPDATE') {
              return prev.map((b) =>
                b.id === (payload.new as Booking).id ? (payload.new as Booking) : b
              );
            }
            if (payload.eventType === 'DELETE') {
              return prev.filter((b) => b.id !== (payload.old as Booking).id);
            }
            return prev;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const totalBookings = getTotalBookings(bookings);
  const totalRevenue = getTotalRevenue(bookings, routes);
  const popularRoute = getMostPopularRoute(bookings, routes);
  const aiInsight = generateAIInsight(bookings, routes);

  async function handleSurge() {
    if (!popularRoute.route) return;
    setSurging(true);
    try {
      await applySurgeProtocol(popularRoute.route.id);
      await refreshRoutes();
    } catch (e: any) {
      alert('Failed to apply surge: ' + e.message);
    } finally {
      setSurging(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 uppercase tracking-widest text-sm">
            Initializing Telemetry...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center p-8">
        <div className="bg-red-900/20 border border-red-500/30 rounded-2xl p-8 max-w-md text-center">
          <h2 className="text-xl font-bold text-red-400 mb-2">System Error</h2>
          <p className="text-slate-300">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 p-8 font-sans relative overflow-hidden">
      {/* Futuristic Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-cyan-600/20 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header */}
        <header className="mb-12 border-b border-slate-800 pb-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center font-bold shadow-[0_0_10px_rgba(99,102,241,0.5)] text-slate-900">
              N
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
              NomadCore Command
            </h1>
          </div>
          <p className="text-slate-400 mt-2 text-sm tracking-wide uppercase font-semibold">
            Real-time Telemetry & USSD Grid
          </p>
        </header>

        {/* The "Smart AI" Alert Card */}
        <div className="relative mb-10 group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-1000"></div>
          <div className="relative bg-slate-900 border border-slate-800 rounded-2xl p-8 backdrop-blur-xl">
            <div className="flex items-center gap-3 mb-4">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
              </span>
              <span className="text-cyan-400 text-xs font-bold uppercase tracking-widest">
                System Intelligence Active
              </span>
            </div>
            <p className="text-xl font-light leading-relaxed text-slate-200 mb-6">
              {aiInsight}
            </p>
            <button
              onClick={handleSurge}
              disabled={surging || !popularRoute.route}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 text-white px-6 py-3 rounded-lg font-semibold text-sm transition-all shadow-[0_0_15px_rgba(79,70,229,0.4)] hover:shadow-[0_0_25px_rgba(79,70,229,0.6)] flex items-center gap-2"
            >
              {surging ? 'Executing...' : 'Execute Surge Protocol'}
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                ></path>
              </svg>
            </button>
          </div>
        </div>

        {/* Top Level Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-slate-900/50 backdrop-blur-md p-6 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
              Total Grid Bookings
            </h3>
            <p className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-500">
              {totalBookings}
            </p>
          </div>

          <div className="bg-slate-900/50 backdrop-blur-md p-6 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
              Projected Revenue
            </h3>
            <p className="text-4xl font-bold text-emerald-400 tracking-tight">
              ₦{totalRevenue.toLocaleString()}
            </p>
          </div>

          <div className="bg-slate-900/50 backdrop-blur-md p-6 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                Optimal Route
              </h3>
              <p className="text-2xl font-bold text-white truncate">
                {popularRoute.route
                  ? popularRoute.route.name
                  : 'No data'}
              </p>
            </div>
            <p className="text-sm text-cyan-400 font-medium mt-4 flex items-center gap-2">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                ></path>
              </svg>
              {popularRoute.count} active signals
            </p>
          </div>
        </div>

        {/* Admin Controls */}
        <section>
          <h2 className="text-xl font-bold text-white mb-6">Route Operations</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {routes.map((route) => (
              <RouteAdminCard
                key={route.id}
                route={route}
                onUpdate={refreshRoutes}
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function RouteAdminCard({
  route,
  onUpdate,
}: {
  route: Route;
  onUpdate: () => void;
}) {
  const [price, setPrice] = useState(route.price);
  const [seats, setSeats] = useState(10);
  const [updating, setUpdating] = useState(false);

  async function savePrice() {
    setUpdating(true);
    try {
      await updateRoutePrice(route.id, price);
      onUpdate();
    } catch (e: any) {
      alert('Failed to update price: ' + e.message);
    } finally {
      setUpdating(false);
    }
  }

  async function addSeats() {
    setUpdating(true);
    try {
      await scheduleOverflowBus(route.id, seats);
      onUpdate();
    } catch (e: any) {
      alert('Failed to schedule overflow bus: ' + e.message);
    } finally {
      setUpdating(false);
    }
  }

  return (
    <div className="bg-slate-900/50 backdrop-blur-md p-6 rounded-xl border border-slate-800">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-bold text-white">{route.name}</h3>
          {route.origin && route.destination && (
            <p className="text-sm text-slate-400">
              {route.origin} → {route.destination}
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500 uppercase tracking-widest">
            Available Seats
          </p>
          <p className="text-2xl font-bold text-cyan-400">
            {typeof route.available_seats === 'number' ? route.available_seats : '-'}
          </p>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <label className="block text-xs text-slate-500 uppercase tracking-widest mb-1">
            Price (₦)
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
            />
            <button
              onClick={savePrice}
              disabled={updating}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-semibold"
            >
              Update
            </button>
          </div>
        </div>
        <div className="flex-1">
          <label className="block text-xs text-slate-500 uppercase tracking-widest mb-1">
            Overflow Seats
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              value={seats}
              min={1}
              onChange={(e) => setSeats(Number(e.target.value))}
              className="w-20 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
            />
            <button
              onClick={addSeats}
              disabled={updating}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-semibold"
            >
              Add Bus
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
