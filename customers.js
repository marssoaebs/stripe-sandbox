/**
 * customers.js — Stripe Customer object
 *
 * The Customer object is central to Stripe's use cases.
 * It links together: payment methods, subscriptions, invoices, and
 * payment history for a single business or end user.
 *
 * Best practices:
 * - Always create a Customer before taking payment (enables saved cards)
 * - Use metadata to map Stripe Customer IDs to your internal user IDs
 * - Attach PaymentMethods to Customers for repeat billing / subscriptions
 */

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

/**
 * POST /create-customer
 * Body: { email, name, phone?, metadata? }
 *
 * Example request:
 *   { "email": "user@example.com", "name": "Test User", "metadata": { "internal_user_id": "USR-123" } }
 */
async function createCustomer(req, res) {
  const { email, name, phone, metadata = {} } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required to create a Customer' });
  }

  try {
    const customer = await stripe.customers.create({
      email,
      name,
      phone,
      metadata: {
        ...metadata,
        // Best practice: always store your internal user ID in metadata
        // so you can map between your system and Stripe
        created_at: new Date().toISOString(),
      },
    });

    console.log(`👤 Customer created: ${customer.id} | ${email}`);

    res.json({
      customerId: customer.id,   // Store this in your DB — use it for future payments
      email: customer.email,
      name: customer.name,
      created: new Date(customer.created * 1000).toISOString(),
      // In test mode, dashboard URL for easy inspection:
      dashboardUrl: `https://dashboard.stripe.com/test/customers/${customer.id}`,
    });

  } catch (error) {
    console.error('❌ Customer creation failed:', error.message);
    res.status(400).json({ error: error.message, type: error.type });
  }
}

module.exports = { createCustomer };
