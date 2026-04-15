import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '../../../lib/supabase-server';
import AfricasTalking from 'africastalking';

let atInstance: ReturnType<typeof AfricasTalking> | null = null;

function getAT() {
  if (!atInstance) {
    atInstance = AfricasTalking({
      apiKey: process.env.AFRICASTALKING_API_KEY!,
      username: process.env.AFRICASTALKING_USERNAME!,
    });
  }
  return atInstance;
}

function sendSmsAsync(phoneNumber: string, message: string) {
  try {
    const at = getAT();
    at.SMS.send({
      to: [phoneNumber],
      message,
      from: process.env.AFRICASTALKING_SENDER_ID || 'sandbox',
    }).catch((err: any) => {
      console.error('Async SMS Error:', err);
    });
  } catch (initErr) {
    console.error('Africa\'s Talking init failed:', initErr);
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const sessionId = formData.get('sessionId') as string | null;
    const phoneNumber = formData.get('phoneNumber') as string | null;
    const text = (formData.get('text') as string | null) ?? '';

    if (!sessionId || !phoneNumber) {
      return ussdResponse('END Missing session or phone number.');
    }

    console.log('📞 Incoming Request:', { text, phoneNumber, sessionId });

    let response = '';

    if (text === '') {
      response = 'CON Welcome to NomadCore\n1. Book a Ticket\n2. Check Booking Status';
    } else if (text === '1') {
      const { data: routes, error } = await supabaseServer
        .from('routes')
        .select('id,name,price')
        .order('name');

      if (error || !routes || routes.length === 0) {
        console.error('Supabase error fetching routes:', error);
        response = 'END Error fetching routes.';
      } else {
        response = 'CON Select Route:\n';
        routes.forEach((route: any, index: number) => {
          response += `${index + 1}. ${route.name} (₦${route.price})\n`;
        });
      }
    } else if (text.startsWith('1*')) {
      const parts = text.split('*');
      const routeIndexRaw = Number(parts[1]);
      const routeIndex = Number.isFinite(routeIndexRaw) ? routeIndexRaw - 1 : -1;

      const { data: routes, error: routesError } = await supabaseServer
        .from('routes')
        .select('id,name,price')
        .order('name');

      if (routesError) {
        console.error('Supabase error fetching routes for booking:', routesError);
        return ussdResponse('END Error fetching routes.');
      }

      if (!routes || routeIndex < 0 || routeIndex >= routes.length) {
        response = 'END Invalid selection.';
      } else {
        const selectedRoute = routes[routeIndex];
        const ticketCode = `NC-${Math.random().toString(36).substring(7).toUpperCase()}`;

        const { error: dbError } = await supabaseServer.from('bookings').insert({
          ticket_code: ticketCode,
          phone_number: phoneNumber,
          route_id: selectedRoute.id,
          session_id: sessionId,
          status: 'confirmed',
        });

        if (dbError) {
          console.error('Supabase insert error:', dbError);
          response = 'END System busy. Please try again.';
        } else {
          response = `END Success!\nTicket: ${ticketCode}`;
          // Fire SMS asynchronously; do NOT block USSD response
          sendSmsAsync(
            phoneNumber,
            `NOMADCORE TICKET\nRoute: ${selectedRoute.name}\nCode: ${ticketCode}`
          );
        }
      }
    } else if (text === '2') {
      const { data: bookings, error } = await supabaseServer
        .from('bookings')
        .select('ticket_code,status,created_at,routes(name)')
        .eq('phone_number', phoneNumber)
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) {
        console.error('Supabase error fetching bookings:', error);
        response = 'END Error checking status.';
      } else if (!bookings || bookings.length === 0) {
        response = 'END No bookings found for this number.';
      } else {
        response = 'END Your Bookings:\n';
        bookings.forEach((b: any, idx: number) => {
          const routeName = b.routes?.name || 'Unknown Route';
          response += `${idx + 1}. ${routeName}\nCode: ${b.ticket_code}\nStatus: ${b.status}\n\n`;
        });
      }
    } else {
      response = 'END Invalid option.';
    }

    return ussdResponse(response);
  } catch (error) {
    console.error('Global Error:', error);
    return ussdResponse('END Service error. Please try again later.');
  }
}

function ussdResponse(body: string) {
  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain',
      'ngrok-skip-browser-warning': 'true',
    },
  });
}
