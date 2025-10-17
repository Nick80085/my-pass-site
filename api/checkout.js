import Stripe from "stripe";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const { type } = req.body; // "one_time" or "subscription"

    // Replace these with your own Price IDs from Stripe
    const oneTimePrice = "price_1SIqDJB8xhbBUiT51sZgLMYI"; 
    const monthlyPrice = "price_1SIqB7B8xhbBUiT50CSZYgZ8";

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price: type === "subscription" ? monthlyPrice : oneTimePrice,
          quantity: 1,
        },
      ],
      mode: type === "subscription" ? "subscription" : "payment",
      success_url: "https://my-pass-site.vercel.app//success",
      cancel_url: "https://my-pass-site.vercel.app//cancel",
    });

    res.status(200).json({ url: session.url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
