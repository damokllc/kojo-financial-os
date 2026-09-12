import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('x-paystack-signature');
  
  // Verify webhook authenticity
  const hash = crypto
    .createHmac('sha512', process.env.PAYSTACK_WEBHOOK_SECRET || '')
    .update(body)
    .digest('hex');

  if (hash !== signature) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const event = JSON.parse(body);
  
  // Handle payment events
  switch (event.event) {
    case 'charge.success':
      // Payment successful — log to DB or trigger action
      console.log('✅ Paystack payment success:', event.data.reference, event.data.amount / 100, event.data.currency);
      break;
    case 'transfer.success':
      console.log('✅ Paystack transfer success:', event.data.reference);
      break;
    default:
      console.log('Paystack event:', event.event);
  }

  return NextResponse.json({ received: true });
}
