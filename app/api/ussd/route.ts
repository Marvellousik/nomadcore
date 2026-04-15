import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '../../../lib/supabase-server';
import AfricasTalking from 'africastalking';

const at = AfricasTalking({
  apiKey: process.env.AFRICASTALKING_API_KEY!,
  username: process.env.AFRICASTALKING_USERNAME!,
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const sessionId = formData.get('sessionId') as string;
    const phoneNumber = formData.get('phoneNumber') as string;
    const text = (formData.get('text') as string) || '';

    console.log('📞 Incoming Request:', { text, phoneNumber });

    let response = '';

    if (text === '') {
      response = 'CON Welcome to NomadCore\n1. Book a Ticket\n2. Check Booking Status';
    } else if (text === '1') {
      const { data: routes, error } = await supabaseServer
        .from('routes')
        .select('*')
        .order('name');

      if (error || !routes) {
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
      const routeIndex = parseInt(parts[1]) - 1;

      const { data: routes } = await supabaseServer
        .from('routes')
        .select('*')
        .order('name');

      const selectedRoute = routes?.[routeIndex];

      if (!selectedRoute) {
        response = 'END Invalid selection.';
      } else {
        const ticketCode = `NC-${Math.random().toString(36).substring(7).toUpperCase()}`;

        const { error: dbError } = await supabaseServer.from('bookings').insert({
          ticket_code: ticketCode,
          phone_number: phoneNumber,
          route_id: selectedRoute.id,
          session_id: sessionId,
          status: 'confirmed',
        });

        if (dbError) {
          console.error('Supabase Error:', dbError);
          response = 'END System busy.';
        } else {
          try {
            await at.SMS.send({
              to: [phoneNumber],
              message: `NOMADCORE TICKET\nRoute: ${selectedRoute.name}\nCode: ${ticketCode}`,
              from: 'sandbox',
            });
            response = `END Success!\nTicket: ${ticketCode}\nSMS sent.`;
          } catch (smsError) {
            console.error('SMS Error:', smsError);
            response = `END Saved!\nTicket: ${ticketCode}\n(SMS failed)`;
          }
        }
      }
    } else {
      response = 'END Invalid option.';
    }

    return new NextResponse(response, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
        'ngrok-skip-browser-warning': 'true',
      },
    });
  } catch (error) {
    console.error('Global Error:', error);
    return new NextResponse('END Service error.', {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
        'ngrok-skip-browser-warning': 'true',
      },
    });
  }
}
