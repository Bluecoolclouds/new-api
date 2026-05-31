---
name: Admin & User Management
description: User roles, creating and managing users, quota management, rate limits, system settings, dashboard, and admin-only operations.
---

# Admin & User Management

## User Roles

| Role | Capabilities |
|---|---|
| **Root** | Full access — system settings, all users, all channels, delete/create admins |
| **Admin** | Manage users (not root), channels, tokens, redemption codes. Cannot change system settings |
| **User** | Own tokens, own wallet, own usage logs only |

## Managing Users (Admin)

**Creating a user manually:**
1. Users → Add User
2. Set username, password, display name
3. Set group (Default, VIP, Free, etc.)
4. Set initial quota if needed

**Editing a user:**
1. Users → find user → Edit (pencil icon)
2. Can change: password, group, quota, rate limits, enable/disable account, reset 2FA

**Disabling a user:**
- Users → toggle the status switch — user cannot log in or make API calls

**Adding quota to a user:**
- Users → Edit → Quota field → set new value (remember: 500,000 units = 1 USD)
- Or generate a redemption code and give it to the user

## Groups

Groups control pricing multipliers and model access:
1. System Settings → Groups → Add/Edit groups
2. Assign multipliers (1.0 = standard price; 0.5 = half price for VIP)
3. Users → Edit → change a user's group

## Rate Limits

Configurable per-user or globally:

| Setting | Location |
|---|---|
| Global RPM | System Settings → Rate Limiting |
| Per-user RPM | User → Edit → Rate Limit |
| Per-token RPM | Token → Edit (not available by default, contact admin) |

Rate limit errors return HTTP 429. Users can check their limits in their profile.

## System Settings Overview

Navigate to **System Settings** (root only):

| Section | What's there |
|---|---|
| **General** | Site name, logo, footer, registration settings |
| **Operations** | Top-up amounts, payment gateways, quota gift on register |
| **Model Prices** | Per-model pricing ratios |
| **Rate Limiting** | Global request rate limits |
| **OAuth** | Social login provider configurations |
| **Email** | SMTP settings for email verification/notifications |
| **Monitoring** | Alert thresholds, notification webhooks |
| **Other** | Debug mode, log levels, performance settings |

## Dashboard & Analytics

**Dashboard** (admin view):
- Total requests over time
- Quota consumption breakdown
- Channel health status
- Active users count
- Revenue metrics (if payment is configured)

**Usage Logs** (admin can filter all users):
- Filter by: date range, user, token, model, status
- Export as CSV for billing reconciliation

## Channel Management Tips

**Testing all channels:**
- Channels → select all → Test — runs a quick validation call on each

**Setting up redundancy:**
- Add 2+ channels for the same model with equal priority and weight
- The system load-balances between them automatically

**Monitoring channel health:**
- Channels page shows last test time and success rate
- Enable Telegram/email notifications for channel failures in System Settings → Monitoring

## Common Admin Tasks

### User can't access a model
1. Check which group the user is in
2. Check if any channel supports that model for that group
3. Check if the user's token has model restrictions

### User reports charges but no service
1. Check Usage Logs for the user — find the specific request
2. Check if quota was refunded (logged as negative consumption)
3. If the request failed at channel level, quota should be refunded automatically

### Channel keeps getting auto-disabled
1. Channels → find it → check the last error
2. Update the API key if it shows 401
3. Increase retry timeout if it shows timeout errors
4. Contact the upstream provider if their service is down

### Adding a new payment method
- System Settings → Operations → enable the desired gateway
- Enter the gateway's credentials (API keys, merchant ID, etc.)
- Test with a small amount before going live
