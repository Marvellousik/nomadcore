'use server';

import { revalidatePath } from 'next/cache';
import { supabaseServer } from './supabase-server';

export async function updateRoutePrice(routeId: number, newBasePrice: number) {
  const { error } = await supabaseServer
    .from('routes')
    .update({ base_price: newBasePrice })
    .eq('id', routeId);

  if (error) throw new Error(error.message);
  revalidatePath('/');
}

export async function applySurgeProtocol(routeId: number) {
  const { data: route, error: fetchError } = await supabaseServer
    .from('routes')
    .select('base_price')
    .eq('id', routeId)
    .single();

  if (fetchError || !route) {
    throw new Error(fetchError?.message || 'Route not found');
  }

  const newPrice = Math.round(route.base_price * 1.15);

  const { error } = await supabaseServer
    .from('routes')
    .update({ base_price: newPrice })
    .eq('id', routeId);

  if (error) throw new Error(error.message);
  revalidatePath('/');
  return newPrice;
}

export async function scheduleOverflowBus(routeId: number, extraSeats: number) {
  const { data: route, error: fetchError } = await supabaseServer
    .from('routes')
    .select('total_seats')
    .eq('id', routeId)
    .single();

  if (fetchError || !route) {
    throw new Error(fetchError?.message || 'Route not found');
  }

  const { error } = await supabaseServer
    .from('routes')
    .update({ total_seats: route.total_seats + extraSeats })
    .eq('id', routeId);

  if (error) throw new Error(error.message);
  revalidatePath('/');
}

export async function expireOldBookings() {
  const { error } = await supabaseServer
    .from('bookings')
    .update({ status: 'expired' })
    .eq('status', 'pending')
    .lt('payment_expires_at', new Date().toISOString());

  if (error) throw new Error(error.message);
  revalidatePath('/');
  return true;
}

export async function confirmAllPendingBookings() {
  const { error } = await supabaseServer
    .from('bookings')
    .update({ status: 'confirmed' })
    .eq('status', 'pending');

  if (error) throw new Error(error.message);
  revalidatePath('/');
  return true;
}
