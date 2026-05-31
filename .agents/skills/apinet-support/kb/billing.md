---
name: Billing & Wallet
description: Quota system, wallet top-up, payment gateways (Stripe, EPay, FreeKassa, Creem, Waffo), redemption codes, usage logs, and pricing ratios.
---

# Billing & Wallet

## Quota System

- **Base ratio:** 1 USD = 500,000 quota units
- Quota is displayed in USD equivalent in the UI
- Each model has a pricing ratio — more powerful models cost more quota per token
- Quota is consumed per request based on: `(input_tokens + output_tokens) × model_ratio`

## Checking Your Balance

- **User:** Profile icon → **Wallet** (shows current balance and usage history)
- **Admin:** Users list → click a user → see their quota
- **Via API:** `GET /api/user/self` — returns `quota` field

## Topping Up (Users)

Depending on what the admin has enabled:

### Online Payment Methods
1. Go to **Wallet** → **Top Up**
2. Select amount
3. Choose payment method:
   - **Stripe** — credit/debit cards (global)
   - **EPay** — China payment aggregator (Alipay, WeChat Pay)
   - **FreeKassa** — Russian payment system
   - **Creem** — global payments
   - **Waffo** — global payments
4. Complete payment — quota is credited automatically

### Redemption Codes
1. Go to **Wallet** → **Redeem Code**
2. Enter the code
3. Click **Redeem** — quota is added immediately

**Code doesn't work?**
- Code may already be used (each code is single-use unless batch codes)
- Code may be expired
- Check for typos — codes are case-sensitive
- Contact admin if code should be valid

## Redemption Codes (Admin)

1. Go to **Redemption Codes** in admin panel
2. Click **Generate**
3. Set:
   - **Quota** — value in quota units per code
   - **Count** — how many codes to generate
   - **Expiration** — optional expiry date
4. Export the generated codes as CSV

## Usage Logs

Found at **Usage Logs** in navigation:
- Shows every API request
- Columns: time, model, tokens used, quota consumed, user/token, status
- Filterable by date, model, user, token
- Admins can see all users; regular users see only their own

## Pricing Management (Admin)

- **System Settings → Model Prices** — set per-model pricing ratios
- **Group pricing** — different groups (VIP, Free, etc.) can have different multipliers
- **Completion ratio** — separate ratio for output tokens vs input tokens
- **Cache billing** — for models that support cache hits (OpenAI, DeepSeek), cached tokens cost less

## Common Billing Issues

### "Insufficient user quota"
- Balance is too low for the requested operation
- **Fix:** Top up the wallet, or ask admin to add quota manually

### Payment completed but quota not added
1. Check the payment gateway's transaction status
2. Check Usage Logs for any credit entry
3. Payment webhooks may be delayed — wait 5 minutes
4. Contact admin with the transaction ID

### Quota deducted but request failed
- The system pre-consumes quota before sending to upstream
- If the request fails, quota is automatically refunded
- For async tasks (Midjourney, Suno, video) — refund happens when the task status is known
- Check Usage Logs — failed requests show as refunded
