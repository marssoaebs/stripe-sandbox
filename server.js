/**
 * server.js — Stripe Sandbox Integration
 *
 * Covers:
 *   POST /create-payment-intent   → Create a PaymentIntent (core Stripe flow)
 *   POST /create-customer         → Create a Customer object
 *   GET  /payment-status/:id      → Retrieve a PaymentIntent by ID
 *   POST /webhook                 → Handle Stripe webhook events
 */

require('dotenv').config();
const express = require('express');
const app = express();

// ─── Middleware ───────────────────────────────────────────────────────────────
// IMPORTANT: Webhook endpoint needs raw body for signature verification
// All other routes use JSON parsing
app.use('/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());

// ─── Route Handlers ───────────────────────────────────────────────────────────
const { createPaymentIntent, getPaymentStatus } = require('./payments');
const { createCustomer } = require('./customers');
const { handleWebhook } = require('./webhook');

app.post('/create-payment-intent', createPaymentIntent);
app.post('/create-customer', createCustomer);
app.get('/payment-status/:id', getPaymentStatus);
app.post('/webhook', handleWebhook);

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    status: 'running',
    environment: 'Stripe sandbox (test mode)',
    endpoints: [
      'POST /create-payment-intent',
      'POST /create-customer',
      'GET  /payment-status/:id',
      'POST /webhook',
    ]
  });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Stripe sandbox server running on http://localhost:${PORT}`);
  console.log(`🔑 Using Stripe key: ${process.env.STRIPE_SECRET_KEY?.substring(0, 14)}...`);
  console.log(`📌 Environment: Test mode (sandbox)`);
});
