---
name: Channels
description: Adding and managing upstream AI provider channels, channel errors, routing, automatic disabling, and supported providers.
---

# Channels (Upstream Providers)

Channels are connections to actual AI providers (OpenAI, Anthropic, etc.). APINET.CLOUD routes user requests through these channels.

## Supported Providers

| Provider | Models |
|---|---|
| OpenAI | GPT-4o, GPT-4, GPT-3.5, DALL-E, Whisper, TTS, o1/o3 |
| Anthropic | Claude 3.5 Sonnet, Claude 3 Opus/Haiku, Claude 3.7 (thinking) |
| Google | Gemini 1.5/2.0 Flash, Gemini Pro, Gemini Ultra |
| DeepSeek | deepseek-chat, deepseek-reasoner |
| Midjourney | Image generation via Midjourney Proxy |
| Suno | Music generation |
| AWS Bedrock | Claude, Titan, and other Bedrock models |
| Ali/Qwen, Baidu/Wenxin, Tencent/Hunyuan | Chinese providers |
| Mistral, Cohere, Jina | Other providers |

## Adding a Channel

1. Go to **Channels** → **Add Channel**
2. Select the **Type** (provider)
3. Enter the **API Key** from your provider account
4. Set the **Base URL** if needed (leave default for standard providers)
5. Select **Models** this channel supports
6. Set **Priority** and **Weight** for routing
7. Click **Test** to verify the connection before saving

## Channel Status

- 🟢 **Enabled** — active and receiving traffic
- 🔴 **Disabled** — manually or automatically disabled
- ⚠️ **Auto-disabled** — system disabled it due to repeated failures

### Auto-Disable Behavior

The system automatically disables a channel when:
- The upstream returns `401 Unauthorized` (invalid key)
- The upstream returns repeated `500` errors
- Response time consistently exceeds the configured limit

**To re-enable:** Channels → find the channel → click **Enable** (fix the underlying issue first)

## Channel Errors

### "No available channel for model [name] in group [group]" (503)
- No enabled channel supports the requested model for this user's group
- **Fix options:**
  1. Add a channel that supports the model
  2. Add the model to an existing channel's supported model list
  3. Check if user is in the right group

### "Channel invalid key" / 401 from upstream
- The API key for this channel is wrong or expired
- **Fix:** Channels → edit the channel → update the API key → Test → Save

### "Response time exceeded"
- The upstream provider responded too slowly
- **Fix:** Increase the timeout in channel settings, or use a different channel

### "Affinity channel is disabled"
- A request targeted a specific channel (affinity routing) but that channel is now disabled
- **Fix:** Re-enable the channel or remove the affinity targeting

## Routing Logic

- **Priority:** Higher priority channels are tried first
- **Weight:** Channels with the same priority use weighted random selection
- **Auto-retry:** On failure, the system automatically tries another channel (for retriable errors)
- **Load balancing:** Multiple channels for the same model distribute traffic automatically
