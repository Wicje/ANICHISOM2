# ContinuaOS — Production Credential Setup Guide

This guide walks you through setting up real credentials for deployment.

## Prerequisites

- [Supabase project](https://supabase.com) (free tier works)
- [Vercel account](https://vercel.com) (free tier works)
- [Resend account](https://resend.com) (free tier: 3,000 emails/month)
- [Stripe account](https://stripe.com) (optional, for paid plans)

---

## 1. Supabase Setup

### 1.1 Get Your Keys

Go to **Supabase Dashboard → Project Settings → API**:

| Variable | Where to find it |
|----------|-----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL (e.g., `https://xyz.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `anon` `public` key |
| `SUPABASE_SECRET_KEY` | `service_role` key (keep secret!) |
| `SUPABASE_JWTS_URL` | Same as Project URL + `/auth/v1` |

### 1.2 Run the Schema

Go to **Supabase Dashboard → SQL Editor → New Query**:

1. Paste the contents of `supabase-schema.sql`
2. Click **Run**
3. Verify tables were created: `users`, `workspaces`, `projects`, `context_records`, `vitals_metrics`, `marketplace_submissions`, `marketplace_apps`

### 1.3 Enable Realtime (Optional)

For real-time collaboration:
- Go to **Database → Replication**
- Enable replication for: `users`, `context_records`, `apps`

---

## 2. Vercel Deployment

### 2.1 Connect Repository

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository: `Wicje/ANICHISOM2`
3. Framework: **Next.js** (auto-detected)
4. Install Command: `npm install --legacy-peer-deps`
5. Build Command: `next build` (default)
6. Output Directory: `.next` (default)

### 2.2 Set Environment Variables

Go to **Project Settings → Environment Variables** and add:

```bash
# === REQUIRED ===
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-anon-key
SUPABASE_SECRET_KEY=your-service-role-key
SUPABASE_JWTS_URL=https://your-project.supabase.co/auth/v1
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
NEXT_PUBLIC_AUTH_PROVIDER=supabase

# === EMAIL (get from resend.com) ===
RESEND_API_KEY=re_your_key_here
RESEND_FROM_EMAIL=ContinuaOS <noreply@yourdomain.com>

# === STRIPE (optional, get from dashboard.stripe.com) ===
STRIPE_SECRET_KEY=sk_test_your_key
STRIPE_WEBHOOK_SECRET=whsec_your_secret
STRIPE_PRO_MONTHLY_PRICE_ID=price_xxx
STRIPE_PRO_YEARLY_PRICE_ID=price_xxx
STRIPE_TEAM_MONTHLY_PRICE_ID=price_xxx
STRIPE_TEAM_YEARLY_PRICE_ID=price_xxx
```

### 2.3 Deploy

1. Click **Deploy**
2. Wait for build to complete (~2-3 minutes)
3. Your app is live at `https://your-app.vercel.app`

---

## 3. Resend Email Setup

### 3.1 Create Account

1. Go to [resend.com](https://resend.com)
2. Sign up (free tier: 3,000 emails/month)
3. Go to **API Keys → Create API Key**
4. Copy the key (starts with `re_`)

### 3.2 Verify Domain (Recommended)

For production emails:
1. Go to **Domains → Add Domain**
2. Add DNS records to your domain
3. Wait for verification (~5 minutes)

### 3.3 Set Environment Variable

```bash
RESEND_API_KEY=re_your_actual_key
RESEND_FROM_EMAIL=ContinuaOS <noreply@yourdomain.com>
```

---

## 4. Stripe Setup (Optional)

Only needed if you want paid plans (Pro/Team).

### 4.1 Create Products

1. Go to [dashboard.stripe.com](https://dashboard.stripe.com)
2. **Products → Add Product**:
   - Name: "ContinuaOS Pro"
   - Price: $12/month, $96/year
3. **Products → Add Product**:
   - Name: "ContinuaOS Team"
   - Price: $24/month per seat, $192/year per seat

### 4.2 Get Price IDs

After creating products, copy the Price IDs (start with `price_`):

```bash
STRIPE_PRO_MONTHLY_PRICE_ID=price_1ABC...
STRIPE_PRO_YEARLY_PRICE_ID=price_1DEF...
STRIPE_TEAM_MONTHLY_PRICE_ID=price_1GHI...
STRIPE_TEAM_YEARLY_PRICE_ID=price_1JKL...
```

### 4.3 Set Up Webhook

1. Go to **Developers → Webhooks → Add Endpoint**
2. URL: `https://your-app.vercel.app/api/billing/webhook`
3. Events to send:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
4. Copy the webhook signing secret:

```bash
STRIPE_WEBHOOK_SECRET=whsec_your_secret
```

---

## 5. Post-Deployment Checklist

- [ ] Supabase schema run successfully
- [ ] First user auto-promoted to admin (via `handle_new_user()` trigger)
- [ ] Login works with email/password
- [ ] Google/GitHub OAuth works (if configured)
- [ ] Emails send on signup (check Resend dashboard)
- [ ] Analytics dashboard shows vitals data
- [ ] Marketplace submissions work
- [ ] Stripe checkout works (if configured)

---

## 6. Custom Domain (Optional)

1. Go to Vercel **Project Settings → Domains**
2. Add your custom domain
3. Update DNS records as instructed
4. Update `NEXT_PUBLIC_APP_URL` to your custom domain
5. Update OAuth redirect URLs if using Google/GitHub

---

## Troubleshooting

### "Unauthorized" errors
- Check `SUPABASE_SECRET_KEY` is the service_role key (not anon key)
- Verify the key is not a placeholder (`PASTE_YOUR_SECRET_KEY_HERE`)

### Emails not sending
- Check `RESEND_API_KEY` starts with `re_`
- Verify domain in Resend dashboard
- Check spam folder for test emails

### Build fails on Vercel
- Ensure `npm install --legacy-peer-deps` is set as install command
- Check build logs for missing env vars

### Stripe webhook not receiving events
- Verify webhook URL is correct
- Check webhook signing secret matches
- Look at Stripe webhook logs for errors
