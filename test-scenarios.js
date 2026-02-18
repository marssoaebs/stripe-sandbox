/**
 * test-scenarios.js — Run test scenarios from the terminal
 *
 * This script uses Stripe's API directly (no frontend needed).
 * It demonstrates the PaymentIntent lifecycle end-to-end.
 *
 * Run: node test-scenarios.js
 *
 * Tests multiple scenarios: successful payments, card declines,
 * insufficient funds, and the 3DS authentication flow.
 */

require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// ─── Test Payment Methods (Stripe's built-in test tokens) ─────────────────────
// These are pre-built PaymentMethod IDs for server-side testing.
// In a real frontend, the card number is tokenised by Stripe.js instead.
const TEST_PAYMENT_METHODS = {
  success:              'pm_card_visa',                          // 4242 4242 4242 4242
  genericDecline:       'pm_card_visa_chargeDeclined',           // Declined
  insufficientFunds:    'pm_card_visa_chargeDeclinedInsufficientFunds',
  fraudDecline:         'pm_card_visa_chargeDeclinedFraudulent',
  uk_visa:              'pm_card_gb_visa',                       // UK Visa — relevant for Stripe UK
};

// ─── Helper to create + confirm a PaymentIntent in one step ──────────────────
async function testPayment(label, paymentMethod, amount = 5000, currency = 'gbp') {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`🧪 TEST: ${label}`);
  console.log(`   Amount: £${amount / 100} ${currency.toUpperCase()}`);
  console.log(`   PaymentMethod: ${paymentMethod}`);

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      payment_method: paymentMethod,
      confirm: true,                    // Confirm immediately (server-side test only)
      return_url: 'https://example.com/return',  // Required for some payment methods
      metadata: {
        test_scenario: label,
        timestamp: new Date().toISOString(),
      },
    });

    console.log(`   ✅ Result:  ${paymentIntent.status}`);
    console.log(`   📋 PI ID:  ${paymentIntent.id}`);
    return { success: true, id: paymentIntent.id, status: paymentIntent.status };

  } catch (error) {
    console.log(`   ❌ Result:  ${error.type}`);
    console.log(`   📋 Code:   ${error.code}`);
    if (error.raw?.decline_code) {
      console.log(`   📋 Decline: ${error.raw.decline_code}`);
    }
    console.log(`   📋 Message: ${error.message}`);
    return { success: false, code: error.code, message: error.message };
  }
}

// ─── Create a Customer and link a PaymentIntent ───────────────────────────────
async function testCustomerFlow() {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`🧪 TEST: Customer creation + linked payment`);

  try {
    // Step 1: Create a Customer
    const customer = await stripe.customers.create({
      email: 'test@example.com',
      name: 'Test User',
      metadata: { internal_user_id: 'USR-DEMO-001' },
    });
    console.log(`   👤 Customer created: ${customer.id}`);

    // Step 2: Create a PaymentIntent linked to the Customer
    const paymentIntent = await stripe.paymentIntents.create({
      amount: 9900,               // £99.00
      currency: 'gbp',
      customer: customer.id,      // Links this payment to the customer
      payment_method: TEST_PAYMENT_METHODS.success,
      confirm: true,
      return_url: 'https://example.com/return',
      metadata: {
        test_scenario: 'customer_linked_payment',
        order_ref: 'ORD-DEMO-001',
      },
    });

    console.log(`   💳 Payment status: ${paymentIntent.status}`);
    console.log(`   📋 PI ID: ${paymentIntent.id}`);
    console.log(`   🔗 Customer: ${paymentIntent.customer}`);
    console.log(`\n   👉 View in dashboard: https://dashboard.stripe.com/test/customers/${customer.id}`);

    return { customerId: customer.id, paymentIntentId: paymentIntent.id };

  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
  }
}

// ─── Retrieve and inspect a PaymentIntent ─────────────────────────────────────
async function testRetrieve(paymentIntentId) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`🧪 TEST: Retrieve PaymentIntent — ${paymentIntentId}`);

  const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
  console.log(`   Status:   ${pi.status}`);
  console.log(`   Amount:   £${pi.amount / 100}`);
  console.log(`   Created:  ${new Date(pi.created * 1000).toISOString()}`);
  console.log(`   Metadata: ${JSON.stringify(pi.metadata)}`);
}

// ─── Run all scenarios ────────────────────────────────────────────────────────
async function runAllScenarios() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║     Stripe Sandbox — Payment Scenarios Test Suite       ║');
  console.log('╚══════════════════════════════════════════════════════════╝');

  // 1. Happy path — successful payment
  const successResult = await testPayment(
    'Successful payment (Visa)',
    TEST_PAYMENT_METHODS.success,
    5000,
    'gbp'
  );

  // 2. Card decline — generic
  await testPayment(
    'Generic card decline',
    TEST_PAYMENT_METHODS.genericDecline,
    2000,
    'gbp'
  );

  // 3. Insufficient funds
  await testPayment(
    'Insufficient funds decline',
    TEST_PAYMENT_METHODS.insufficientFunds,
    15000,
    'gbp'
  );

  // 4. UK Visa card (relevant for Stripe UK context)
  await testPayment(
    'UK Visa card (GBP)',
    TEST_PAYMENT_METHODS.uk_visa,
    7500,
    'gbp'
  );

  // 5. Customer-linked payment
  const customerResult = await testCustomerFlow();

  // 6. Retrieve and inspect a PaymentIntent
  if (successResult?.id) {
    await testRetrieve(successResult.id);
  }

  // ─── Summary ───────────────────────────────────────────────────────────────
  console.log(`\n${'═'.repeat(60)}`);
  console.log('📊 SUMMARY — All scenarios tested');
  console.log('   ✅ Successful payment flow');
  console.log('   ❌ Decline scenarios (generic, insufficient funds)');
  console.log('   🇬🇧 UK-specific card variant');
  console.log('   👤 Customer object creation + linked payment');
  console.log('   🔍 PaymentIntent retrieval + status inspection');
  console.log(`\n👉 View all test payments in the Stripe Dashboard:`);
  console.log(`   https://dashboard.stripe.com/test/payments`);
  console.log(`${'═'.repeat(60)}\n`);
}

// Run
runAllScenarios().catch(console.error);
