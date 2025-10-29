import Stripe from 'stripe';
import { Resend } from 'resend';
import PDFDocument from 'pdfkit';

export const config = { api: { bodyParser: false } };

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const resend = new Resend(process.env.RESEND_API_KEY);

// načtení raw body kvůli ověření Stripe podpisu
function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

// vytvoření PDF do Bufferu
function makePassPdf({ name, monthLabel }) {
  return new Promise((resolve) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks = [];
    doc.on('data', (d) => chunks.push(d));
    doc.on('end', () => resolve(Buffer.concat(chunks)));

    // jednoduchý design
    doc.rect(0, 0, doc.page.width, doc.page.height).fill('#111827');
    doc.fillColor('#ffffff');
    doc.fontSize(28).text('Digital Pass', { align: 'center' });
    doc.moveDown(1.5);
    doc.fontSize(18).text(`Name: ${name}`, { align: 'center' });
    doc.text(`Valid for: ${monthLabel}`, { align: 'center' });
    doc.moveDown(2);
    doc.fontSize(12).fillColor('#9ca3af').text('Thank you for your purchase!', { align: 'center' });

    doc.end();
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  try {
    const sig = req.headers['stripe-signature'];
    const buf = await getRawBody(req);
    const event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;

      const name =
        (session.metadata && session.metadata.display_name) ||
        session.customer_details?.name ||
        'Guest';

      const email = session.customer_details?.email || session.customer_email;
      const monthLabel = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });

      // vygeneruj PDF
      const pdfBuffer = await makePassPdf({ name, monthLabel });

      // pošli e-mail přes Resend (nutné env: RESEND_API_KEY, EMAIL_FROM)
      if (process.env.RESEND_API_KEY && process.env.EMAIL_FROM) {
        await resend.emails.send({
          from: process.env.EMAIL_FROM, // např. "Passes <onboarding@resend.dev>"
          to: email,
          subject: `Your Pass for ${monthLabel}`,
          html: `<p>Hi ${name},</p><p>Attached is your pass for <b>${monthLabel}</b>.</p>`,
          attachments: [
            {
              filename: `Pass-${monthLabel}.pdf`,
              content: pdfBuffer.toString('base64'),
              contentType: 'application/pdf',
            },
          ],
        });
        console.log('✅ Email sent to', email);
      } else {
        console.warn('⚠️ Missing RESEND_API_KEY or EMAIL_FROM; email not sent');
      }
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('Webhook Error:', err);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
}
