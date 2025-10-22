const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { type, name, email } = req.body || {};
    if (!type || !email) return res.status(400).json({ error: 'Missing required fields' });

    const ONE_TIME_PRICE = process.env.PRICE_ONETIME;
    const SUB_PRICE = process.env.PRICE_SUBS;

    const priceId = type === 'subscription' ? SUB_PRICE : ONE_TIME_PRICE;
    if (!priceId) return res.status(500).json({ error: 'Price not configured' });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: type === 'subscription' ? 'subscription' : 'payment',
      customer_email: email,
      metadata: { display_name: name || '' },
      success_url: `${process.env.SUCCESS_URL || 'https://my-pass-site.vercel.app'}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CANCEL_URL || 'https://my-pass-site.vercel.app'}/cancel`,
    });

    res.status(200).json({ url: session.url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
