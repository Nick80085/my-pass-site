// api/webhook.js
const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  let event;

  // Read raw body - Vercel passes body parsed => use raw body if available
  const buf = req.rawBody || Buffer.from(JSON.stringify(req.body));

  try {
    event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed.', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle relevant events
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    // FIRST PAYMENT (one-time or first of subscription)
    console.log('checkout.session.completed', session.id, session.customer_email, session.metadata);
    // tady můžeš spustit generování PDF (Zapier/Make nebo vlastní call)
  }

  if (event.type === 'invoice.payment_succeeded') {
    const invoice = event.data.object;
    // recurring subscription successful payment -> generate monthly PDF and email
    console.log('invoice.payment_succeeded', invoice.id, invoice.customer_email);
    // zpracuj automatickou distribuci passu
  }

  res.json({ received: true });
};
