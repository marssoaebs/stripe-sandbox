/**
 * payments.js — PaymentIntent lifecycle
 *
 * The PaymentIntent is the central object in Stripe's payment flow.
 * It tracks a payment from creation → confirmation → success/failure.
 *
 * Flow:
 *   1. Server creates PaymentIntent → gets back client_secret
 *   2. client_secret is sent to the frontend (browser/app)
 *   3. Frontend uses Stripe.js to confirm payment using client_secret
 *   4. Card data NEVER touches your server — Stripe handles PCI compliance
 *   5. Stripe sends webhook event when payment succeeds/fails
 */

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

/**
 * POST /create-payment-intent
 * Body: { amount: number (in pence/cents), currency: string, customerId?: string }
 *
 * Example request:
 *   { "amount": 5000, "currency": "gbp", "metadata": { "order_id": "ORD-001" } }
 *   → Creates a £50.00 payment intent
 */
async function createPaymentIntent(req, res) {
  const { amount, currency = 'gbp', customerId, metadata = {} } = req.body;

  // Validation — amounts are always in smallest currency unit (pence for GBP)
  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'Amount must be a positive integer (in pence/cents)' });
  }

  try {
    const paymentIntentParams = {
      amount,                        // e.g. 5000 = £50.00 (always in smallest unit)
      currency,                      // 'gbp', 'usd', 'eur' etc.
      automatic_payment_methods: {
        enabled: true,               // Stripe automatically handles card, wallets etc.
      },
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString(),
      },
    };

    // Attach to a Customer if provided — enables saved cards, billing history
    if (customerId) {
      paymentIntentParams.customer = customerId;
    }

    const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);

    console.log(`💳 PaymentIntent created: ${paymentIntent.id} | £${amount / 100} ${currency.toUpperCase()} | status: ${paymentIntent.status}`);

    // Return client_secret to frontend — this is what Stripe.js uses to confirm
    // NEVER log or store client_secret — treat it like a password
    res.json({
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,  // Frontend uses this
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      status: paymentIntent.status,               // 'requires_payment_method' initially
    });

  } catch (error) {
    console.error('❌ PaymentIntent creation failed:', error.message);
    res.status(400).json({ error: error.message, type: error.type });
  }
}

/**
 * GET /payment-status/:id
 * Retrieve a PaymentIntent and check its current status
 *
 * PaymentIntent statuses:
 *   requires_payment_method → waiting for card details
 *   requires_confirmation   → ready to confirm
 *   requires_action         → 3DS authentication needed (common in UK/EU)
 *   processing              → payment submitted to card network
 *   succeeded               → payment complete ✅
 *   canceled                → canceled
 */
async function getPaymentStatus(req, res) {
  const { id } = req.params;

  if (!id || !id.startsWith('pi_')) {
    return res.status(400).json({ error: 'Invalid PaymentIntent ID. Should start with pi_' });
  }

  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(id);

    res.json({
      id: paymentIntent.id,
      status: paymentIntent.status,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      customer: paymentIntent.customer,
      metadata: paymentIntent.metadata,
      created: new Date(paymentIntent.created * 1000).toISOString(),
      // Last payment error if declined
      lastError: paymentIntent.last_payment_error
        ? {
            code: paymentIntent.last_payment_error.code,
            message: paymentIntent.last_payment_error.message,
            declineCode: paymentIntent.last_payment_error.decline_code,
          }
        : null,
    });

  } catch (error) {
    console.error('❌ Retrieve PaymentIntent failed:', error.message);
    res.status(404).json({ error: error.message });
  }
}

module.exports = { createPaymentIntent, getPaymentStatus };
