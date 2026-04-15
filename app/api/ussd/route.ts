import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '../../../lib/supabase-server';
import AfricasTalking from 'africastalking';
import { computeDynamicPrice } from '../../../lib/pricing';
import { generateMockPayment } from '../../../lib/payments';

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
      const { data: routes, error } = await supabaseServer.rpc(
        'get_routes_with_availability'
      );

      if (error || !routes || routes.length === 0) {
        console.error('RPC error fetching routes:', error);
        response = 'END Error fetching routes.';
      } else {
        response = 'CON Select Route:\n';
        (routes as any[]).forEach((route: any, index: number) => {
          const remaining = Math.max(
            0,
            (route.total_seats || 0) - (route.booked_seats || 0)
          );
          const price = computeDynamicPrice(route.base_price || 0, remaining);
          const time = route.departure_time ? ` | ${route.departure_time}` : '';
          response += `${index + 1}. ${route.name}${time} (₦${price}) [${remaining} left]\n`;
        });
      }
    } else if (text.startsWith('1*')) {
      const parts = text.split('*');
      const routeIndexRaw = Number(parts[1]);
      const routeIndex = Number.isFinite(routeIndexRaw) ? routeIndexRaw - 1 : -1;

      const { data: routes, error: routesError } = await supabaseServer.rpc(
        'get_routes_with_availability'
      );

      if (routesError) {
        console.error('RPC error fetching routes for booking:', routesError);
        return ussdResponse('END Error fetching routes.');
      }

      const routeList = (routes || []) as any[];
      if (routeIndex < 0 || routeIndex >= routeList.length) {
        response = 'END Invalid selection.';
      } else {
        const selectedRoute = routeList[routeIndex];
        const remaining = Math.max(
          0,
          (selectedRoute.total_seats || 0) - (selectedRoute.booked_seats || 0)
        );

        if (remaining <= 0) {
          response = 'END Sorry, this route is fully booked. Please try another route.';
        } else {
          const ticketCode = `NC-${Math.random().toString(36).substring(7).toUpperCase()}`;
          const price = computeDynamicPrice(selectedRoute.base_price || 0, remaining);
          const payment = generateMockPayment(ticketCode);

          const { error: dbError } = await supabaseServer
            .from('bookings')
            .insert({
              ticket_code: ticketCode,
              phone_number: phoneNumber,
              route_id: selectedRoute.id,
              session_id: sessionId,
              status: 'pending',
              ...payment,
            });

          if (dbError) {
            console.error('Supabase insert error:', dbError);
            response = 'END System busy. Please try again.';
          } else {
            const depTime = selectedRoute.departure_time ? `Departs: ${selectedRoute.departure_time}\n` : '';
            response =
              `END Booking created.\n` +
              depTime +
              `Pay ₦${price} to:\n` +
              `Bank: ${payment.payment_bank}\n` +
              `Acct: ${payment.payment_account}\n` +
              `Ref: ${payment.payment_reference}\n` +
              `Expires in 120 mins\n` +
              `Ticket: ${ticketCode}`;

            sendSmsAsync(
              phoneNumber,
              `NOMADCORE TICKET\nRoute: ${selectedRoute.name}\nCode: ${ticketCode}\nPay ₦${price} to ${payment.payment_bank} | Acct: ${payment.payment_account} | Ref: ${payment.payment_reference}`
            );
          }
        }
      }
    } else if (text === '2') {
      const { data: bookings, error } = await supabaseServer
        .from('bookings')
        .select('ticket_code,status,created_at,payment_expires_at,payment_reference,routes(name,base_price)')
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
        (bookings as any[]).forEach((b: any, idx: number) => {
          const routeName = b.routes?.name || 'Unknown Route';
          const amount = b.routes?.base_price ? `₦${b.routes.base_price}` : '';
          response += `${idx + 1}. ${routeName}\nCode: ${b.ticket_code}\nStatus: ${b.status}${amount ? '\nAmount: ' + amount : ''}\n\n`;
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
