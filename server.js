require('dotenv').config();
const express = require('express');
const path    = require('path');
const stripe  = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app  = express();
const PORT = process.env.PORT || 3000;
const BASE = `http://localhost:${PORT}`;

app.use(express.json());
app.use(express.static(path.join(__dirname)));

/* Create Stripe Checkout Session */
app.post('/api/checkout', async (req, res) => {
  try {
    const { items } = req.body; // [{ name, price, qty }]

    if (!items || !items.length) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    const lineItems = items.map(item => ({
      price_data: {
        currency: 'usd',
        product_data: { name: item.name },
        unit_amount: Math.round(item.price * 100),
      },
      quantity: item.qty,
    }));

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      shipping_address_collection: { allowed_countries: ['US', 'CA', 'GB', 'AU'] },
      success_url: `${BASE}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${BASE}/`,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('Stripe error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/* Success page */
app.get('/success', async (req, res) => {
  let email = '';
  try {
    const session = await stripe.checkout.sessions.retrieve(req.query.session_id);
    email = session.customer_details?.email || '';
  } catch (_) {}

  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Order Confirmed — Lumen Custom</title>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;700&family=Space+Mono:wght@700&display=swap" rel="stylesheet">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Space Grotesk',sans-serif;background:#080808;color:#f0f0f0;min-height:100vh;display:flex;align-items:center;justify-content:center;text-align:center;padding:2rem}
  .box{max-width:480px}
  .ico{width:80px;height:80px;background:#f0f0f0;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 2rem;animation:pop .5s cubic-bezier(.4,0,.2,1)}
  @keyframes pop{from{transform:scale(0);opacity:0}to{transform:scale(1);opacity:1}}
  .ico svg{width:38px;height:38px;color:#080808}
  .logo{font-family:'Space Mono',monospace;font-size:1rem;letter-spacing:.08em;color:#555;margin-bottom:2.5rem;display:block}
  h1{font-size:2.2rem;font-weight:700;letter-spacing:-.02em;margin-bottom:1rem}
  p{color:#888;line-height:1.7;margin-bottom:2rem}
  a{display:inline-block;background:#f0f0f0;color:#080808;padding:.9rem 2rem;border-radius:100px;text-decoration:none;font-weight:700;font-size:.95rem;transition:all .2s}
  a:hover{transform:translateY(-2px);box-shadow:0 10px 28px rgba(255,255,255,.15)}
</style>
</head>
<body>
<div class="box">
  <span class="logo">LUMENCUSTOM</span>
  <div class="ico">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  </div>
  <h1>Order Confirmed!</h1>
  <p>Thank you${email ? ', ' + email.split('@')[0] : ''}! Your order is on its way.<br>Check your email for a receipt and tracking info.</p>
  <a href="/">← Back to Shop</a>
</div>
</body>
</html>`);
});

app.listen(PORT, () => {
  console.log(`\n✓ Lumen Custom running at http://localhost:${PORT}\n`);
});
