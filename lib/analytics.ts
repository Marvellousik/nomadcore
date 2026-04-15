import type { Route, Booking } from './mockData';

export function getTotalBookings(bookings: Booking[]) {
  return bookings.filter((b) => b.status === 'confirmed').length;
}

export function getTotalRevenue(bookings: Booking[], routes: Route[]) {
  let revenue = 0;
  bookings.forEach((booking) => {
    if (booking.status === 'confirmed') {
      const route = routes.find((r) => r.id === booking.route_id);
      if (route) revenue += route.price;
    }
  });
  return revenue;
}

export function getMostPopularRoute(bookings: Booking[], routes: Route[]) {
  const routeCounts: Record<number, number> = {};

  bookings.forEach((booking) => {
    if (booking.status === 'confirmed') {
      routeCounts[booking.route_id] = (routeCounts[booking.route_id] || 0) + 1;
    }
  });

  let topRouteId = 0;
  let maxCount = 0;

  for (const [routeId, count] of Object.entries(routeCounts)) {
    if (count > maxCount) {
      maxCount = count;
      topRouteId = Number(routeId);
    }
  }

  const topRoute = routes.find((r) => r.id === topRouteId);
  return { route: topRoute, count: maxCount };
}

export function generateAIInsight(bookings: Booking[], routes: Route[]) {
  const popular = getMostPopularRoute(bookings, routes);

  if (!popular.route) return 'Not enough data to generate insights.';

  const displayName = popular.route.origin && popular.route.destination
    ? `${popular.route.origin} to ${popular.route.destination}`
    : popular.route.name;

  const seats = popular.route.available_seats ?? 0;

  return `Trend Alert: The ${displayName} route is experiencing unusually high demand (${popular.count} recent bookings). Recommendation: Consider increasing the fare by 15%${seats > 0 ? ` for the remaining ${seats} seats to maximize profit` : ''}, or schedule an overflow bus.`;
}
