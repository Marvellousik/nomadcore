export type Route = {
  id: number;
  name: string;
  origin?: string;
  destination?: string;
  price: number;
  available_seats?: number;
  created_at?: string;
};

export type Booking = {
  id: number;
  ticket_code: string;
  phone_number: string;
  route_id: number;
  session_id: string;
  status: 'confirmed' | 'cancelled';
  created_at: string;
};

export const mockRoutes: Route[] = [
  { id: 1, name: 'Lagos - Ibadan', origin: 'Lagos', destination: 'Ibadan', price: 5000, available_seats: 12 },
  { id: 2, name: 'Abuja - Kaduna', origin: 'Abuja', destination: 'Kaduna', price: 4000, available_seats: 12 },
  { id: 3, name: 'Port Harcourt - Aba', origin: 'Port Harcourt', destination: 'Aba', price: 3000, available_seats: 12 },
];

export const mockBookings: Booking[] = [
  { id: 1, ticket_code: 'NC-ABC123', phone_number: '08012345678', route_id: 1, session_id: 's1', status: 'confirmed', created_at: '2023-10-24T08:00:00Z' },
  { id: 2, ticket_code: 'NC-DEF456', phone_number: '08023456789', route_id: 1, session_id: 's2', status: 'confirmed', created_at: '2023-10-24T08:15:00Z' },
  { id: 3, ticket_code: 'NC-GHI789', phone_number: '08034567890', route_id: 2, session_id: 's3', status: 'confirmed', created_at: '2023-10-25T09:00:00Z' },
  { id: 4, ticket_code: 'NC-JKL012', phone_number: '08045678901', route_id: 3, session_id: 's4', status: 'cancelled', created_at: '2023-10-25T09:30:00Z' },
];
