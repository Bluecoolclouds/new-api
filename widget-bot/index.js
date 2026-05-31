'use strict';

const express = require('express');
const https = require('https');
const http = require('http');
const crypto = require('crypto');

// ── Config ────────────────────────────────────────────────────────────────────
const BOT_TOKEN        = process.env.TELEGRAM_BOT_TOKEN || '';
const SUPPORT_CHAT_ID  = process.env.TELEGRAM_SUPPORT_CHAT_ID || '';
const ADMIN_IDS        = new Set(
  (process.env.ADMIN_IDS || '').split(',').map(s => s.trim()).filter(Boolean)
);
const WIDGET_TOKEN     = process.env.WIDGET_TOKEN || '';
const APINET_BASE      = (process.env.APINET_BASE_URL || 'https://apinet.cloud').replace(/\/$/, '');
const MODEL            = process.env.WIDGET_MODEL || 'gemini-2.5-flash';
const PORT             = parseInt(process.env.PORT || '3000', 10);
const CORS_ORIGIN      = process.env.WIDGET_CORS_ORIGIN || '*';
const WEBHOOK_SECRET   = process.env.WEBHOOK_SECRET || 'apinet_widget_hook';

// Validate required config
const missingVars = [];
if (!BOT_TOKEN)       missingVars.push('TELEGRAM_BOT_TOKEN');
if (!SUPPORT_CHAT_ID) missingVars.push('TELEGRAM_SUPPORT_CHAT_ID');
if (!WIDGET_TOKEN)    missingVars.push('WIDGET_TOKEN');
if (missingVars.length) {
  console.warn('[warn] Missing env vars:', missingVars.join(', '));
  console.warn('[warn] Bot will start but functionality may be limited.');
}

// ── In-memory session store ────────────────────────────────────────────────────
// sessions[sessionId] = { threadId, messages[], pendingReply, lang, createdAt }
const sessions = new Map();

// topicToSession[message_thread_id] → sessionId (for routing admin replies)
const topicToSession = new Map();

// Clean up sessions older than 24h every hour
setInterval(() => {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  for (const [id, sess] of sessions) {
    if (sess.createdAt < cutoff) {
      if (sess.threadId) topicToSession.delete(String(sess.threadId));
      sessions.delete(id);
    }
  }
}, 60 * 60 * 1000);

// ── Telegram Bot API helper ────────────────────────────────────────────────────
function tgRequest(method, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const options = {
      hostname: 'api.telegram.org',
      path: `/bot${BOT_TOKEN}/${method}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    };
    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve({ ok: false, raw: data }); }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function createTopic(sessionId, lang) {
  const time = new Date().toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' });
  const langLabel = lang === 'en' ? '🇬🇧' : '🇷🇺';
  const name = `${langLabel} ${time} · ${sessionId.slice(0, 8)}`;
  const res = await tgRequest('createForumTopic', {
    chat_id: SUPPORT_CHAT_ID,
    name,
    icon_color: 0x6FB9F0,
  });
  if (res.ok) return res.result.message_thread_id;
  console.warn('[tg] createForumTopic failed:', res.description);
  return null;
}

async function sendToTopic(threadId, text, parseMode) {
  const body = {
    chat_id: SUPPORT_CHAT_ID,
    message_thread_id: threadId,
    text,
  };
  if (parseMode) body.parse_mode = parseMode;
  return tgRequest('sendMessage', body);
}

// ── APINET AI call (non-streaming, returns full text) ────────────────────────
function callAI(messages) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      model: MODEL,
      messages,
      stream: false,
      max_tokens: 1024,
      temperature: 0.5,
    });
    const url = new URL(`${APINET_BASE}/v1/chat/completions`);
    const lib = url.protocol === 'https:' ? https : http;
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${WIDGET_TOKEN}`,
        'Content-Length': Buffer.byteLength(payload),
      },
    };
    const req = lib.request(options, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const text = json?.choices?.[0]?.message?.content || '';
          resolve(text);
        } catch {
          reject(new Error(`AI parse error: ${data.slice(0, 200)}`));
        }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

// ── System prompts ─────────────────────────────────────────────────────────────
function getSystemPrompt(lang) {
  if (lang === 'en') {
    return `You are a technical support agent for APINET.CLOUD — an LLM gateway providing access to AI models (OpenAI, Claude, Gemini, DeepSeek, etc.) through a single OpenAI-compatible API.

Reply concisely and clearly. Always respond in English.

Main topics:
- Registration and first login
- API tokens: creation, quota limits, model restrictions
- Wallet top-up: Stripe, FreeKassa, promo/redemption codes
- Errors: 401, 403, 404, 429, 503 and their causes
- Setting up Claude Code with base_url and ANTHROPIC_AUTH_TOKEN
- Available models and their names
- Channels and routing

API Base URL: https://apinet.cloud/v1
Tokens are created at: https://apinet.cloud/keys

If you cannot help or the issue requires account access, direct the user to Telegram: https://t.me/apinet_support

Never invent features that don't exist. Be honest when you don't know.`;
  }
  return `Ты агент технической поддержки сервиса APINET.CLOUD — LLM-шлюза для доступа к AI-моделям (OpenAI, Claude, Gemini, DeepSeek и др.) через единый OpenAI-совместимый API.

Отвечай кратко, чётко и по делу. Всегда отвечай на русском языке.

Основные темы:
- Регистрация и первый вход
- API-токены: создание, лимиты квоты, ограничения по моделям
- Пополнение баланса: Stripe, FreeKassa, промокоды
- Ошибки: 401, 403, 404, 429, 503 и их причины
- Настройка Claude Code: base_url, ANTHROPIC_AUTH_TOKEN
- Доступные модели и их названия
- Каналы и маршрутизация

Base URL для API: https://apinet.cloud/v1
Токены создаются на странице: https://apinet.cloud/keys

Если не можешь помочь или проблема требует доступа к аккаунту — отправь пользователя в Telegram: https://t.me/apinet_support

Никогда не выдумывай функции которых нет. Если не знаешь — скажи честно.`;
}

// ── Express app ────────────────────────────────────────────────────────────────
const app = express();
app.use(express.json({ limit: '256kb' }));

// CORS middleware
app.use((req, res, next) => {
  const origin = CORS_ORIGIN === '*' ? '*' : CORS_ORIGIN;
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// ── POST /widget/message ───────────────────────────────────────────────────────
// Widget sends user message → bot calls AI → forwards to Telegram → returns AI reply
app.post('/widget/message', async (req, res) => {
  const { sessionId, message, lang = 'ru' } = req.body || {};

  if (!sessionId || !message || typeof message !== 'string') {
    return res.status(400).json({ error: 'sessionId and message required' });
  }
  if (message.length > 2000) {
    return res.status(400).json({ error: 'message too long' });
  }

  // Get or create session
  let sess = sessions.get(sessionId);
  if (!sess) {
    sess = { threadId: null, messages: [], pendingReply: null, lang, createdAt: Date.now() };
    sessions.set(sessionId, sess);
  }

  // Build message history
  sess.messages.push({ role: 'user', content: message });
  const historySlice = sess.messages.slice(-10);

  // Call AI
  let aiReply = '';
  try {
    aiReply = await callAI([
      { role: 'system', content: getSystemPrompt(sess.lang) },
      ...historySlice,
    ]);
    sess.messages.push({ role: 'assistant', content: aiReply });
  } catch (err) {
    console.error('[ai] error:', err.message);
    sess.messages.pop();
    return res.status(502).json({ error: 'AI unavailable', details: err.message });
  }

  // Telegram: create topic on first message, then send
  if (BOT_TOKEN && SUPPORT_CHAT_ID) {
    try {
      if (!sess.threadId) {
        sess.threadId = await createTopic(sessionId, sess.lang);
        if (sess.threadId) {
          topicToSession.set(String(sess.threadId), sessionId);
          // Send session info header
          const header = sess.lang === 'en'
            ? `🆔 Session: \`${sessionId}\`\n🌐 Language: English`
            : `🆔 Сессия: \`${sessionId}\`\n🌐 Язык: Русский`;
          await sendToTopic(sess.threadId, header, 'Markdown');
        }
      }
      if (sess.threadId) {
        const userMsg = sess.lang === 'en'
          ? `👤 *User:*\n${message}`
          : `👤 *Пользователь:*\n${message}`;
        await sendToTopic(sess.threadId, userMsg, 'Markdown');

        const botMsg = sess.lang === 'en'
          ? `🤖 *AI reply:*\n${aiReply}`
          : `🤖 *Ответ AI:*\n${aiReply}`;
        await sendToTopic(sess.threadId, botMsg, 'Markdown');
      }
    } catch (err) {
      console.warn('[tg] send error:', err.message);
    }
  }

  res.json({ reply: aiReply, sessionId });
});

// ── GET /widget/poll ───────────────────────────────────────────────────────────
// Widget polls for admin reply (every 3s while chat is open)
app.get('/widget/poll', (req, res) => {
  const { session } = req.query;
  if (!session) return res.status(400).json({ error: 'session required' });

  const sess = sessions.get(session);
  if (!sess) return res.json({ reply: null });

  const reply = sess.pendingReply || null;
  sess.pendingReply = null;
  res.json({ reply });
});

// ── POST /telegram/webhook/<secret> ───────────────────────────────────────────
// Telegram sends updates here (admin replies in topics)
app.post(`/telegram/webhook/${WEBHOOK_SECRET}`, (req, res) => {
  res.sendStatus(200);

  const update = req.body;
  const msg = update?.message;
  if (!msg) return;

  const senderId = String(msg.from?.id || '');
  const text = msg.text || '';
  const threadId = msg.message_thread_id;

  if (!text || !threadId) return;

  // Check admin whitelist — fail-closed: reject ALL if ADMIN_IDS is empty
  if (!ADMIN_IDS.has(senderId)) {
    console.log(`[tg] ignored reply from non-admin ${senderId}`);
    return;
  }

  // Map topic → session
  const sessionId = topicToSession.get(String(threadId));
  if (!sessionId) {
    console.log(`[tg] no session for thread ${threadId}`);
    return;
  }

  const sess = sessions.get(sessionId);
  if (!sess) return;

  // Store admin reply for widget to pick up via poll
  sess.pendingReply = text;
  sess.messages.push({ role: 'assistant', content: `[Admin] ${text}` });

  console.log(`[admin] reply for session ${sessionId.slice(0, 8)}: ${text.slice(0, 60)}`);
});

// ── GET /health ────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    sessions: sessions.size,
    bot: !!BOT_TOKEN,
    admins: ADMIN_IDS.size,
  });
});

// ── Start server ───────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[bot] Widget bridge listening on port ${PORT}`);
  console.log(`[bot] Telegram webhook path: /telegram/webhook/${WEBHOOK_SECRET}`);
  if (ADMIN_IDS.size === 0) {
    console.warn('[bot] ADMIN_IDS is not set — all Telegram replies will be rejected. Set ADMIN_IDS to enable admin replies.');
  } else {
    console.log(`[bot] Admin IDs: ${[...ADMIN_IDS].join(', ')}`);
  }
  if (!BOT_TOKEN) console.warn('[bot] TELEGRAM_BOT_TOKEN not set — Telegram integration disabled');
  if (!WIDGET_TOKEN) console.warn('[bot] WIDGET_TOKEN not set — AI calls will fail');

  // Register webhook with Telegram if WEBHOOK_URL is set
  const webhookUrl = process.env.WEBHOOK_URL;
  if (webhookUrl && BOT_TOKEN) {
    const fullUrl = `${webhookUrl.replace(/\/$/, '')}/telegram/webhook/${WEBHOOK_SECRET}`;
    tgRequest('setWebhook', { url: fullUrl, allowed_updates: ['message'] })
      .then(r => console.log(`[tg] Webhook set: ${fullUrl} →`, r.ok ? 'ok' : r.description))
      .catch(e => console.warn('[tg] Webhook set error:', e.message));
  }
});
