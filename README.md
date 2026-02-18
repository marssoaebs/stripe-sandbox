# Stripe Sandbox Integration
## A Node.js payment integration covering: PaymentIntent, Customer, Webhook

---

## What This Covers

> This integration demonstrates the PaymentIntent lifecycle, Customer object creation,
> card decline simulation, and webhook event handling — essential building blocks
> for any Stripe integration.

---

## Step 1 — Create a Free Stripe Account & Get Test Keys

1. Go to **https://dashboard.stripe.com/register**
2. Sign up (no credit card needed)
3. Once in the Dashboard, you'll automatically be in **Test Mode** (toggle top-left)
4. Go to **Developers → API Keys**
5. Copy your **Secret key** — it starts with `sk_test_...` and paste into `.env`

6. Copy your **Publishable key** — it starts with `pk_test_...` and paste into `.env`
---

## Step 2 — Project Setup (run in your terminal)

```bash
mkdir stripe-sandbox
cd stripe-sandbox
npm init -y
npm install stripe express dotenv
```

Create a `.env` file in the root:
```
STRIPE_SECRET_KEY=sk_test_YOUR_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET_HERE
PORT=3000
```

> ⚠️ Never commit `.env` to Git. Add it to `.gitignore`

---

## Step 3 — File Structure

```
stripe-sandbox/
├── .env
├── .gitignore
├── package.json
├── server.js          ← Main Express server
├── payments.js        ← PaymentIntent logic
├── customers.js       ← Customer creation logic
├── webhook.js         ← Webhook handler
└── test-scenarios.js  ← Run test scenarios from terminal
```

---

## Step 4 — Stripe's Key Concepts

| Concept | What It Is | Why It Matters |
|---|---|---|
| **PaymentIntent** | Server-side object tracking a payment's lifecycle | Core of Stripe's payment flow |
| **PaymentMethod** | Represents a card/bank — reusable, never raw card data | PCI compliance — card data never hits your server |
| **Customer** | Stores a user + their payment methods | Enables subscriptions, saved cards, invoicing |
| **Webhook** | Stripe pushes events to your server | Essential for async flows (3DS, bank transfers) |
| **client_secret** | Token passed to frontend to confirm payment | Security — frontend confirms, backend creates |
| **Test mode** | Sandboxed environment, test API keys | `sk_test_` prefix — safe to experiment freely |

---

## Step 5 — Test Card Numbers

| Card Number | Scenario |
|---|---|
| `4242 4242 4242 4242` | ✅ Always succeeds |
| `4000 0000 0000 0002` | ❌ Generic decline |
| `4000 0000 0000 9995` | ❌ Insufficient funds |
| `4000 0025 0000 3155` | 🔐 Requires 3D Secure authentication |
| `4000 0000 0000 3220` | 🔐 3DS — succeeds after authentication |
| `4000 0082 6000 0000` | 🇬🇧 UK Visa card (relevant for Stripe UK!) |

> For all test cards: use any future expiry date (e.g. 12/34) and any 3-digit CVC

---

## Step 6 — Run the Webhook Listener (Stripe CLI)

Install Stripe CLI: https://docs.stripe.com/stripe-cli

```bash
# Login
stripe login

# Forward webhook events to your local server
stripe listen --forward-to localhost:3000/webhook

# In another terminal — trigger a test event
stripe trigger payment_intent.succeeded
stripe trigger payment_intent.payment_failed
stripe trigger customer.created
```

The CLI prints your webhook signing secret — paste it into `.env` as `STRIPE_WEBHOOK_SECRET`
