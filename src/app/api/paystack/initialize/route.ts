import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { email, amount, currency = 'GHS', metadata = {} } = await req.json();
    
    if (!email || !amount) {
      return NextResponse.json({ error: 'email and amount required' }, { status: 400 });
    }

    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        amount: Math.round(amount * 100), // Paystack uses kobo/pesewas
        currency,
        metadata,
        channels: ['card', 'bank', 'mobile_money'], // Ghana MoMo + cards + bank
      }),
    });

    const data = await response.json();
    if (!data.status) throw new Error(data.message);
    
    return NextResponse.json({ 
      authorization_url: data.data.authorization_url,
      access_code: data.data.access_code,
      reference: data.data.reference,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
