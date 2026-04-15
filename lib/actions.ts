'use server';

import { revalidatePath } from 'next/cache';
import { supabaseServer } from './supabase-server';

export async function updateRoutePrice(routeId: number, newPrice: number) {
  const { error } = await supabaseServer
    .from('routes')
    .update({ price: newPrice })
    .eq('id', routeId);

  if (error) throw new Error(error.message);
  revalidatePath('/');
}

export async function applySurgeProtocol(routeId: number) {
  const { data: route, error: fetchError } = await supabaseServer
    .from('routes')
    .select('price')
    .eq('id', routeId)
    .single();

  if (fetchError || !route) {
    throw new Error(fetchError?.message || 'Route not found');
  }

  const newPrice = Math.round(route.price * 1.15);

  const { error } = await supabaseServer
    .from('routes')
    .update({ price: newPrice })
    .eq('id', routeId);

  if (error) throw new Error(error.message);
  revalidatePath('/');
  return newPrice;
}

export async function scheduleOverflowBus(routeId: number, extraSeats: number) {
  const { data: route, error: fetchError } = await supabaseServer
    .from('routes')
    .select('available_seats')
    .eq('id', routeId)
    .single();

  if (fetchError || !route) {
    throw new Error(fetchError?.message || 'Route not found');
  }

  const currentSeats = route.available_seats ?? 0;

  const { error } = await supabaseServer
    .from('routes')
    .update({ available_seats: currentSeats + extraSeats })
    .eq('id', routeId);

  if (error) throw new Error(error.message);
  revalidatePath('/');
}
