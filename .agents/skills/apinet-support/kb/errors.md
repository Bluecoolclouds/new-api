---
name: Errors & Troubleshooting
description: HTTP error codes, error messages, rate limiting, channel auto-banning, sensitive content detection, and general troubleshooting steps.
---

# Errors & Troubleshooting

## HTTP Status Codes

| Code | Meaning | Common Cause |
|---|---|---|
| 400 | Bad Request | Invalid request parameters |
| 401 | Unauthorized | Invalid or missing API token |
| 403 | Forbidden | Token disabled, IP blocked, or no model access |
| 404 | Not Found | Model name doesn't exist |
| 413 | Request Too Large | Request body exceeds size limit |
| 429 | Too Many Requests | Rate limit hit |
| 500 | Internal Server Error | Unexpected server error |
| 503 | Service Unavailable | No available channel for the model |

## Error Messages Explained

### Quota / Access Errors

**"insufficient_user_quota"**
- User's balance is too low
- Fix: Top up wallet or ask admin for quota

**"Token has no access to any models"**
- Token's model whitelist is set but no models match
- Fix: Edit token → remove or update model restrictions

**"No available channel for model X in group Y"**
- No active channel supports this model for the user's group
- Fix: Add/enable a channel, or check group assignment

### Request Validation Errors

**"model is required"**
- The API request body is missing the `model` field
- Fix: Add `"model": "gpt-4o"` (or desired model) to the request

**"field messages is required"**
- Chat completion request is missing the `messages` array
- Fix: Add `"messages": [{"role": "user", "content": "..."}]`

**"max_tokens is invalid"**
- The `max_tokens` value is out of range
- Fix: Use a reasonable value (e.g., 1–32768 depending on model)

**"size must be one of 1024x1024, 1024x1792 or 1792x1024 for dall-e-3"**
- Invalid image size for DALL-E 3
- Fix: Use one of the listed sizes exactly

**"please use 'x' instead of '×'"**
- Used the Unicode multiplication sign × instead of letter x in a size parameter
- Fix: Change `1024×1024` to `1024x1024`

### Content & Safety Errors

**"user sensitive words detected"**
- The request contains words from the system's sensitive word list
- Fix: Rephrase the request; contact admin if you believe it's a false positive

**"Current group load is saturated, please try again later"** (Midjourney)
- The Midjourney channel is at capacity
- Fix: Wait and retry; admin can add more Midjourney channels

### Channel Errors

**"channel:no_available_key"**
- All channels for the model are disabled/out of keys
- Fix (admin): Re-enable channels or add new API keys

**"channel:invalid_key"**
- Upstream provider rejected the channel's API key
- Fix (admin): Update the API key in the channel settings

**"channel:response_time_exceeded"**
- Upstream took too long to respond
- Fix: Retry the request; admin can increase timeout or add faster channels

**"model_not_found"**
- The requested model doesn't exist in any channel
- Fix: Check model name spelling; use a model that's available

## Rate Limiting

APINET.CLOUD supports multiple rate limit levels:

| Level | Where Configured |
|---|---|
| Per-user RPM/RPD | User settings or group settings |
| Per-token | Token settings |
| Global | System Settings → Rate Limiting |

**Getting 429 errors?**
1. Check if you're hitting a per-minute limit — wait 60 seconds and retry
2. Ask admin to increase your rate limit
3. Implement exponential backoff in your client code

## General Troubleshooting Steps

1. **Check the error message** — it usually tells you exactly what's wrong
2. **Check token status** — is it enabled, not expired, not quota-exceeded?
3. **Check channel status** — are channels for the model enabled?
4. **Check user balance** — is the quota > 0?
5. **Check Usage Logs** — the log entry shows the exact error and quota consumed
6. **Test in Playground** — use the built-in playground to isolate if it's an API client issue

## Midjourney-Specific Issues

**Task stuck in "In Progress"**
- Midjourney tasks can take 1–3 minutes
- If stuck over 10 minutes: the system will eventually auto-refund the quota

**Image generation failed / refunded**
- The upstream Midjourney Proxy reported a failure
- Quota is automatically refunded for failed image tasks

## Async Task Errors (Suno, Video generation)

- These tasks lock quota upfront (`ForcePreConsume`)
- If the task fails, quota is refunded when the final status is received
- Check **Task** section in navigation for status and error details
