import Stripe from 'stripe';
import { Resend } from 'resend';
import PDFDocument from 'pdfkit';
import fs from 'fs';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const resend = new Resend(process.env.RESEND_API_KEY);

export const config = {
  api: { bodyParser: false },
};

export default async function handler(req, res) {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    const body = await buffer(req);
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('⚠️ Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const customerEmail = session.customer_email;
    const name = session.metadata.display_name || 'Guest';
    const month = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

    // 🔹 vytvoření PDF
    const pdfPath = `/tmp/pass-${Date.now()}.pdf`;
    const doc = new PDFDocument();
    const stream = fs.createWriteStream(pdfPath);
    doc.pipe(stream);

    doc.fontSize(22).text('Your Monthly Pass', { align: 'center' });
    doc.moveDown();
    doc.fontSize(16).text(`Name: ${name}`, { align: 'center' });
    doc.text(`Month: ${month}`, { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text('Thank you for your purchase!', { align: 'center' });

    doc.end();

    await new Promise(resolve => stream.on('finish', resolve));

    // 🔹 odeslání e-mailu s PDF
    try {
      await resend.emails.send({
        from: 'N-Word Pass <noreply@yourdomain.com>',
        to: customerEmail,
        subject: 'Your Monthly Pass',
        html: `<p>Hello ${name},</p><p>Here is your pass for ${month}.</p>`,
        attachments: [
          {
            filename: `Pass-${month}.pdf`,
            path: pdfPath,
          },
        ],
      });
      console.log(`✅ Email sent to ${customerEmail}`);
    } catch (err) {
      console.error('❌ Error sending email:', err);
    }
  }

  res.status(200).send('ok');
}

function buffer(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}
