/**
 * webhook.js — Stripe Webhook Event Handler
 *
 * Why webhooks matter:
 * Stripe is async. When a customer pays, the payment might not succeed
 * immediately (3DS authentication, bank transfers, fraud checks).
 * Your server CANNOT just wait for the API response — you MUST listen
 * to webhook events to know the final outcome.
 *
 * Signature Verification:
 * Every webhook Stripe sends includes a signature header.
 * You MUST verify it using your webhook secret — otherwise anyone
 * could send fake events to your endpoint.
 */

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function handleWebhook(req, res) {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  // ── Step 1: Verify the webhook signature ─────────────────────────────────
  // This proves the event genuinely came from Stripe, not a malicious actor.
  // req.body must be the RAW buffer (see express.raw() in server.js)
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error(`❌ Webhook signature verification failed: ${err.message}`);
    // Return 400 so Stripe knows the event wasn't processed — it will retry
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  console.log(`📨 Webhook received: ${event.type} | ID: ${event.id}`);

  // ── Step 2: Handle specific event types ──────────────────────────────────
  // Only handle events your integration cares about.
  // Always return 200 quickly — do heavy processing asynchronously.
  try {
    switch (event.type) {

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object;
        console.log(`✅ Payment succeeded!`);
        console.log(`   Amount:   £${paymentIntent.amount / 100}`);
        console.log(`   PI ID:    ${paymentIntent.id}`);
        console.log(`   Customer: ${paymentIntent.customer || 'guest'}`);
        console.log(`   Metadata: ${JSON.stringify(paymentIntent.metadata)}`);
        // → In production: fulfil the order, send confirmation email, update your DB
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object;
        const error = paymentIntent.last_payment_error;
        console.log(`❌ Payment failed!`);
        console.log(`   PI ID:        ${paymentIntent.id}`);
        console.log(`   Error code:   ${error?.code}`);
        console.log(`   Decline code: ${error?.decline_code}`);
        console.log(`   Message:      ${error?.message}`);
        // → In production: notify customer, trigger retry flow, alert support
        break;
      }

      case 'payment_intent.requires_action': {
        const paymentIntent = event.data.object;
        console.log(`🔐 3DS Authentication required`);
        console.log(`   PI ID:  ${paymentIntent.id}`);
        console.log(`   Action: ${paymentIntent.next_action?.type}`);
        // → In production: no action needed server-side — frontend handles 3DS challenge
        // This is common for UK/EU customers under SCA (Strong Customer Authentication)
        break;
      }

      case 'customer.created': {
        const customer = event.data.object;
        console.log(`👤 New customer created: ${customer.id} | ${customer.email}`);
        // → In production: sync to CRM, trigger onboarding flow
        break;
      }

      case 'charge.dispute.created': {
        const dispute = event.data.object;
        console.log(`⚠️  Dispute opened!`);
        console.log(`   Dispute ID: ${dispute.id}`);
        console.log(`   Amount:     £${dispute.amount / 100}`);
        console.log(`   Reason:     ${dispute.reason}`);
        // → In production: alert finance team, gather evidence, respond within deadline
        // This is something an enterprise SA would specifically discuss with customers
        break;
      }

      default:
        // Acknowledge receipt of events we don't handle — prevents Stripe retrying
        console.log(`ℹ️  Unhandled event type: ${event.type}`);
    }

    // ── Step 3: Always return 200 to acknowledge receipt ─────────────────────
    // If you return non-200, Stripe will retry the webhook (up to 3 days).
    // This can cause duplicate order processing — always return 200.
    res.json({ received: true, eventType: event.type, eventId: event.id });

  } catch (err) {
    console.error(`❌ Error processing webhook event: ${err.message}`);
    // Return 500 so Stripe retries — something went wrong on our end
    res.status(500).json({ error: 'Internal error processing webhook' });
  }
}

module.exports = { handleWebhook };
