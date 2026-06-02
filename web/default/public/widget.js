(function () {
  'use strict';

  const cfg = window.APINET_WIDGET || {};
  const API_BASE  = cfg.baseUrl || 'https://apinet.cloud';
  const API_TOKEN = cfg.token  || '';
  const BOT_URL   = (cfg.botUrl || '').replace(/\/$/, '');
  const MODEL     = cfg.model  || 'gemini-2.5-flash';
  const TG_LINK   = cfg.telegram || 'https://t.me/apinet_support';

  const BOT_MODE = !!BOT_URL;

  const SESSION_ID = (function () {
    let id = sessionStorage.getItem('aw_session');
    if (!id) {
      id = 'aw-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
      sessionStorage.setItem('aw_session', id);
    }
    return id;
  })();

  function detectLang() {
    if (cfg.lang) return cfg.lang.startsWith('en') ? 'en' : 'ru';
    const siteLang = document.documentElement.lang || '';
    if (siteLang.startsWith('en')) return 'en';
    const browserLang = (navigator.language || navigator.userLanguage || '').toLowerCase();
    if (browserLang.startsWith('en')) return 'en';
    return 'ru';
  }
  const LANG = detectLang();

  const T = {
    ru: {
      title: 'Поддержка APINET',
      subtitle: 'Обычно отвечаем моментально',
      tgLabel: 'Связь в Telegram',
      placeholder: 'Напишите вопрос…',
      supportLabel: 'Поддержка',
      errorMsg: (code, tg) => `Ошибка ${code}. Попробуйте позже или напишите в [Telegram](${tg}).`,
      connectErr: (tg) => `Не удалось подключиться к серверу. Проверьте соединение или напишите в [Telegram](${tg}).`,
      noToken: '⚠️ Виджет не настроен — не указан API токен.\n\nДобавьте перед тегом `<script>`:\n```\nwindow.APINET_WIDGET = { token: "sk-..." };\n```',
      noBotUrl: '⚠️ Виджет не настроен — не указан botUrl.\n\nДобавьте:\n```\nwindow.APINET_WIDGET = { botUrl: "https://your-bot.replit.app" };\n```',
      welcome: 'Привет! 👋 Я помогаю с вопросами по APINET.CLOUD.\n\nСпросите про:\n- Создание токена и пополнение баланса\n- Ошибки API (401, 403, 503…)\n- Настройку Claude Code\n- Доступные модели\n\nЧем могу помочь?',
      ariaOpen: 'Открыть чат поддержки',
      ariaClose: 'Закрыть',
      ariaSend: 'Отправить',
      reportBtn: '⚠️ Сообщить о проблеме',
      reportTemplate: 'У меня проблема:\n- Приложение: \n- Код ошибки: \n- Текст ошибки: \n- Название API-ключа: ',
      chips: ['Как создать API-ключ?', 'Ошибка 401', 'Пополнить баланс', 'Список моделей'],
      rateGood: 'Полезно',
      rateBad: 'Не помогло',
      rateThanks: 'Спасибо за оценку!',
      unread: 'непрочитанных',
    },
    en: {
      title: 'APINET Support',
      subtitle: 'Usually replies instantly',
      tgLabel: 'Contact via Telegram',
      placeholder: 'Type your question…',
      supportLabel: 'Support',
      errorMsg: (code, tg) => `Error ${code}. Please try again or contact us on [Telegram](${tg}).`,
      connectErr: (tg) => `Could not connect to the server. Check your connection or reach us on [Telegram](${tg}).`,
      noToken: '⚠️ Widget not configured — API token is missing.\n\nAdd before `<script>`:\n```\nwindow.APINET_WIDGET = { token: "sk-..." };\n```',
      noBotUrl: '⚠️ Widget not configured — botUrl is missing.\n\nAdd:\n```\nwindow.APINET_WIDGET = { botUrl: "https://your-bot.replit.app" };\n```',
      welcome: 'Hi! 👋 I can help with APINET.CLOUD questions.\n\nAsk me about:\n- Creating tokens and topping up balance\n- API errors (401, 403, 503…)\n- Setting up Claude Code\n- Available models\n\nHow can I help?',
      ariaOpen: 'Open support chat',
      ariaClose: 'Close',
      ariaSend: 'Send',
      reportBtn: '⚠️ Report an issue',
      reportTemplate: 'I have an issue:\n- App: \n- Error code: \n- Error message: \n- API key name: ',
      chips: ['How to create an API key?', 'Error 401', 'Top up balance', 'Available models'],
      rateGood: 'Helpful',
      rateBad: 'Not helpful',
      rateThanks: 'Thanks for your feedback!',
      unread: 'unread',
    },
  };
  const t = T[LANG];

  const SYSTEM_PROMPT = cfg.systemPrompt || (LANG === 'en'
    ? `You are a technical support agent for APINET.CLOUD — an LLM gateway that provides access to AI models (OpenAI, Claude, Gemini, DeepSeek, etc.) through a single OpenAI-compatible API.

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

If you cannot help or the issue requires account access, direct the user to Telegram: ${TG_LINK}

Never invent features that don't exist. Be honest when you don't know.`
    : `Ты агент технической поддержки сервиса APINET.CLOUD — LLM-шлюза, который предоставляет доступ к AI-моделям (OpenAI, Claude, Gemini, DeepSeek и др.) через единый OpenAI-совместимый API.

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

Если не можешь помочь или проблема требует доступа к аккаунту — отправь пользователя в Telegram: ${TG_LINK}

Никогда не выдумывай функции которых нет. Если не знаешь — скажи честно.`
  );

  const ICON_TG    = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8l-1.68 7.91c-.12.57-.46.71-.93.44l-2.58-1.9-1.24 1.2c-.14.14-.26.26-.52.26l.18-2.62 4.74-4.28c.21-.18-.04-.28-.32-.1L7.9 14.38 5.36 13.6c-.56-.17-.57-.56.12-.83l8.91-3.44c.47-.17.88.11.72.83z"/></svg>`;
  const ICON_CHAT  = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>`;
  const ICON_CLOSE = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>`;
  const ICON_SEND  = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>`;
  const ICON_BOT   = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a2 2 0 012 2c0 .74-.4 1.38-1 1.72V7h1a7 7 0 017 7H3a7 7 0 017-7h1V5.72A2 2 0 0112 2zM7.5 14a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm9 0a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm-4.5 3a1 1 0 100 2 1 1 0 000-2zm-5 3h12l-1 2H7l-1-2z"/></svg>`;

  const STYLES = `
    #apinet-widget-btn {
      position: fixed; bottom: 24px; right: 24px; z-index: 999999;
      width: 56px; height: 56px; border-radius: 50%;
      background: linear-gradient(135deg, #2563eb, #1d4ed8);
      box-shadow: 0 4px 20px rgba(37,99,235,0.45);
      border: none; cursor: pointer; display: flex; align-items: center; justify-content: center;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    #apinet-widget-btn:hover { transform: scale(1.08); box-shadow: 0 6px 26px rgba(37,99,235,0.55); }
    #apinet-widget-btn svg { width: 26px; height: 26px; transition: opacity 0.2s; color: white !important; fill: white !important; }
    #apinet-widget-badge {
      position: absolute; top: -4px; right: -4px;
      min-width: 20px; height: 20px; border-radius: 10px;
      background: #ef4444; color: white; font-size: 11px; font-weight: 700;
      display: flex; align-items: center; justify-content: center;
      padding: 0 5px; border: 2px solid white;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      pointer-events: none; animation: aw-badge-pop 0.25s cubic-bezier(0.34,1.56,0.64,1);
    }
    #apinet-widget-btn-wrap {
      position: fixed; bottom: 24px; right: 24px; z-index: 999999;
      width: 56px; height: 56px;
    }
    @keyframes aw-badge-pop { from { transform: scale(0); } to { transform: scale(1); } }
    #apinet-widget-panel {
      position: fixed; bottom: 92px; right: 24px; z-index: 999998;
      width: 360px; max-width: calc(100vw - 32px);
      height: 560px; max-height: calc(100vh - 120px);
      background: #ffffff; border-radius: 16px;
      box-shadow: 0 8px 40px rgba(0,0,0,0.18);
      display: flex; flex-direction: column; overflow: hidden;
      opacity: 0; transform: translateY(16px) scale(0.97); pointer-events: none;
      transition: opacity 0.22s ease, transform 0.22s ease;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      color-scheme: light; color: #1e293b;
    }
    #apinet-widget-panel *, #apinet-widget-panel *::before, #apinet-widget-panel *::after {
      box-sizing: border-box;
    }
    #apinet-widget-panel.open { opacity: 1; transform: translateY(0) scale(1); pointer-events: all; }
    .aw-header {
      background: linear-gradient(135deg, #2563eb, #1d4ed8);
      padding: 12px 14px 0; display: flex; flex-direction: column; flex-shrink: 0;
    }
    .aw-header-top { display: flex; align-items: center; gap: 10px; padding-bottom: 10px; }
    .aw-header-icon { width: 32px; height: 32px; background: rgba(255,255,255,0.2); border-radius: 50%;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .aw-header-icon svg { width: 16px; height: 16px; }
    .aw-header-text { flex: 1; }
    .aw-header-title { color: white; font-weight: 600; font-size: 14px; line-height: 1.2; }
    .aw-header-sub { color: rgba(255,255,255,0.75); font-size: 11px; margin-top: 1px; }
    .aw-close { background: none; border: none; cursor: pointer; padding: 4px; color: rgba(255,255,255,0.8);
      border-radius: 6px; display: flex; transition: background 0.15s; }
    .aw-close:hover { background: rgba(255,255,255,0.15); color: white; }
    .aw-close svg { width: 18px; height: 18px; }
    .aw-tg-bar {
      background: rgba(255,255,255,0.12); border-radius: 8px; margin: 0 0 8px;
      display: flex; align-items: center; gap: 7px;
      padding: 7px 10px; text-decoration: none; cursor: pointer;
      transition: background 0.15s; border: 1px solid rgba(255,255,255,0.2);
    }
    .aw-tg-bar:hover { background: rgba(255,255,255,0.2); }
    .aw-tg-bar svg { width: 16px; height: 16px; color: white; flex-shrink: 0; }
    .aw-tg-bar span { color: white; font-size: 12.5px; font-weight: 500; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    .aw-report-bar {
      background: rgba(255,255,255,0.10); border-radius: 8px; margin: 0 0 10px;
      display: flex; align-items: center; gap: 7px;
      padding: 6px 10px; cursor: pointer;
      transition: background 0.15s; border: 1px solid rgba(255,255,255,0.15);
      color: rgba(255,255,255,0.9); font-size: 12px; font-weight: 500;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
    .aw-report-bar:hover { background: rgba(255,255,255,0.18); }
    .aw-chips {
      padding: 8px 12px 4px; display: flex; flex-wrap: wrap; gap: 6px; flex-shrink: 0;
      border-bottom: 1px solid #f1f5f9;
    }
    .aw-chip {
      background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 20px;
      padding: 4px 11px; font-size: 12px; color: #475569; cursor: pointer;
      transition: background 0.15s, color 0.15s, border-color 0.15s;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      white-space: nowrap;
    }
    .aw-chip:hover { background: #2563eb; color: white; border-color: #2563eb; }
    .aw-messages {
      flex: 1; overflow-y: auto; padding: 14px 12px; display: flex; flex-direction: column; gap: 10px;
      scroll-behavior: smooth; background: #ffffff; color: #1e293b;
    }
    .aw-messages::-webkit-scrollbar { width: 4px; }
    .aw-messages::-webkit-scrollbar-track { background: transparent; }
    .aw-messages::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 4px; }
    .aw-msg { max-width: 88%; display: flex; flex-direction: column; gap: 3px; }
    .aw-msg.user   { align-self: flex-end; }
    .aw-msg.bot    { align-self: flex-start; }
    .aw-msg.admin  { align-self: flex-start; }
    .aw-msg-label  { font-size: 10px; font-weight: 600; color: #64748b; padding: 0 2px; letter-spacing: 0.03em; }
    .aw-bubble {
      padding: 9px 13px; border-radius: 14px; font-size: 13.5px; line-height: 1.5;
      word-break: break-word; white-space: pre-wrap;
    }
    .aw-msg.user  .aw-bubble { background: #2563eb; color: white; border-bottom-right-radius: 4px; }
    .aw-msg.bot   .aw-bubble { background: #f1f5f9; color: #1e293b; border-bottom-left-radius: 4px; }
    .aw-msg.admin .aw-bubble { background: #ecfdf5; color: #064e3b; border-bottom-left-radius: 4px;
      border: 1px solid #a7f3d0; }
    .aw-bubble a { color: #2563eb; }
    .aw-msg.bot .aw-bubble code, .aw-msg.admin .aw-bubble code {
      background: #e2e8f0; padding: 1px 5px; border-radius: 4px; font-size: 12px; font-family: monospace;
    }
    .aw-msg.bot .aw-bubble pre, .aw-msg.admin .aw-bubble pre {
      background: #1e293b; color: #e2e8f0; padding: 10px 12px; border-radius: 8px; overflow-x: auto;
      font-size: 12px; margin: 6px 0; white-space: pre;
    }
    .aw-msg.bot .aw-bubble pre code, .aw-msg.admin .aw-bubble pre code { background: none; padding: 0; color: inherit; }
    .aw-rating {
      display: flex; align-items: center; gap: 6px; margin-top: 4px; padding: 0 2px;
    }
    .aw-rate-btn {
      background: none; border: 1px solid #e2e8f0; border-radius: 6px;
      padding: 2px 8px; font-size: 12px; cursor: pointer; color: #64748b;
      transition: background 0.15s, border-color 0.15s, color 0.15s;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
    .aw-rate-btn:hover { background: #f1f5f9; border-color: #cbd5e1; color: #1e293b; }
    .aw-rate-btn.good:hover { background: #dcfce7; border-color: #86efac; color: #15803d; }
    .aw-rate-btn.bad:hover  { background: #fee2e2; border-color: #fca5a5; color: #b91c1c; }
    .aw-rate-thanks { font-size: 11px; color: #94a3b8; font-style: italic; }
    .aw-typing { display: flex; align-items: center; gap: 4px; padding: 10px 13px; }
    .aw-typing span { width: 7px; height: 7px; border-radius: 50%; background: #94a3b8;
      animation: aw-bounce 1.2s infinite; }
    .aw-typing span:nth-child(2) { animation-delay: 0.2s; }
    .aw-typing span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes aw-bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-6px)} }
    .aw-footer { padding: 10px 12px; border-top: 1px solid #e2e8f0; display: flex; gap: 8px; flex-shrink: 0; background: #ffffff; color: #1e293b; }
    .aw-input {
      flex: 1; border: 1.5px solid #e2e8f0; border-radius: 10px; padding: 9px 12px;
      font-size: 13.5px; outline: none; resize: none; font-family: inherit;
      transition: border-color 0.15s; line-height: 1.4; max-height: 90px; overflow-y: auto; color: #1e293b;
      background: #fff;
    }
    .aw-input:focus { border-color: #2563eb; }
    .aw-input::placeholder { color: #94a3b8; }
    .aw-send {
      width: 38px; height: 38px; border-radius: 10px; background: #2563eb;
      border: none; cursor: pointer; display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; align-self: flex-end; transition: background 0.15s, transform 0.1s;
    }
    .aw-send:hover { background: #1d4ed8; }
    .aw-send:active { transform: scale(0.95); }
    .aw-send:disabled { background: #93c5fd; cursor: not-allowed; }
    .aw-send svg { width: 17px; height: 17px; }
    .aw-powered {
      font-size: 10px; color: #cbd5e1; text-align: center; padding: 0 0 7px;
      flex-shrink: 0; letter-spacing: 0.01em; background: #ffffff;
    }
  `;

  function escapeHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function renderMarkdown(text) {
    let h = escapeHtml(text);
    h = h.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, _l, code) => `<pre><code>${code.trim()}</code></pre>`);
    h = h.replace(/`([^`]+)`/g, '<code>$1</code>');
    h = h.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    h = h.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    h = h.replace(/(^|[\s(])(https?:\/\/[^\s<)"]+)/g, '$1<a href="$2" target="_blank" rel="noopener">$2</a>');
    return h;
  }

  function init() {
    const style = document.createElement('style');
    style.textContent = STYLES;
    document.head.appendChild(style);

    // ── Button wrapper (for badge positioning) ──────────────────────────────
    const btnWrap = document.createElement('div');
    btnWrap.id = 'apinet-widget-btn-wrap';
    btnWrap.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:999999;width:56px;height:56px;';

    const btn = document.createElement('button');
    btn.id = 'apinet-widget-btn';
    btn.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;';
    btn.setAttribute('aria-label', t.ariaOpen);
    btn.innerHTML = ICON_CHAT;
    btnWrap.appendChild(btn);

    const badge = document.createElement('div');
    badge.id = 'apinet-widget-badge';
    badge.style.display = 'none';
    btnWrap.appendChild(badge);

    const panel = document.createElement('div');
    panel.id = 'apinet-widget-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', t.title);
    panel.innerHTML = `
      <div class="aw-header">
        <div class="aw-header-top">
          <div class="aw-header-icon">${ICON_BOT}</div>
          <div class="aw-header-text">
            <div class="aw-header-title">${t.title}</div>
            <div class="aw-header-sub">${t.subtitle}</div>
          </div>
          <button class="aw-close" aria-label="${t.ariaClose}">${ICON_CLOSE}</button>
        </div>
        <a class="aw-tg-bar" href="${TG_LINK}" target="_blank" rel="noopener">
          ${ICON_TG}<span>${t.tgLabel}</span>
        </a>
        <button class="aw-report-bar" id="aw-report-btn">${t.reportBtn}</button>
      </div>
      <div class="aw-chips" id="aw-chips"></div>
      <div class="aw-messages" id="aw-messages"></div>
      <div class="aw-footer">
        <textarea class="aw-input" id="aw-input" placeholder="${t.placeholder}" rows="1" maxlength="2000"></textarea>
        <button class="aw-send" id="aw-send" aria-label="${t.ariaSend}">${ICON_SEND}</button>
      </div>
      <div class="aw-powered">APINET.CLOUD · AI Support</div>
    `;

    document.body.appendChild(btnWrap);
    document.body.appendChild(panel);

    const messagesEl = panel.querySelector('#aw-messages');
    const inputEl    = panel.querySelector('#aw-input');
    const sendBtn    = panel.querySelector('#aw-send');
    const chipsEl    = panel.querySelector('#aw-chips');
    const reportBtn  = panel.querySelector('#aw-report-btn');
    let isOpen      = false;
    let isStreaming  = false;
    const history   = [];
    let pollTimer   = null;
    let unreadCount = 0;

    // ── Unread badge ─────────────────────────────────────────────────────────
    function incrementUnread() {
      if (isOpen) return;
      unreadCount++;
      badge.textContent = unreadCount > 9 ? '9+' : String(unreadCount);
      badge.style.display = 'flex';
    }

    function clearUnread() {
      unreadCount = 0;
      badge.style.display = 'none';
    }

    // ── FAQ chips ────────────────────────────────────────────────────────────
    function buildChips(chips) {
      chipsEl.innerHTML = '';
      chips.forEach(function (label) {
        const chip = document.createElement('button');
        chip.className = 'aw-chip';
        chip.textContent = label;
        chip.addEventListener('click', function () {
          if (isStreaming) return;
          inputEl.value = '';
          sendMessage(label);
          // Hide chips after use
          chipsEl.style.display = 'none';
        });
        chipsEl.appendChild(chip);
      });
    }

    buildChips(t.chips);

    // ── Rating row ───────────────────────────────────────────────────────────
    function addRating(msgEl) {
      const row = document.createElement('div');
      row.className = 'aw-rating';

      const goodBtn = document.createElement('button');
      goodBtn.className = 'aw-rate-btn good';
      goodBtn.textContent = '👍 ' + t.rateGood;

      const badBtn = document.createElement('button');
      badBtn.className = 'aw-rate-btn bad';
      badBtn.textContent = '👎 ' + t.rateBad;

      function rate() {
        row.innerHTML = '<span class="aw-rate-thanks">' + t.rateThanks + '</span>';
      }
      goodBtn.addEventListener('click', rate);
      badBtn.addEventListener('click', rate);

      row.appendChild(goodBtn);
      row.appendChild(badBtn);
      msgEl.appendChild(row);
    }

    // ── Messages ─────────────────────────────────────────────────────────────
    function addMessage(text, role, withRating) {
      const msg = document.createElement('div');
      msg.className = `aw-msg ${role}`;
      if (role === 'admin') {
        const label = document.createElement('div');
        label.className = 'aw-msg-label';
        label.textContent = t.supportLabel;
        msg.appendChild(label);
      }
      const bubble = document.createElement('div');
      bubble.className = 'aw-bubble';
      if (role === 'user') {
        bubble.textContent = text;
      } else {
        bubble.innerHTML = renderMarkdown(text);
      }
      msg.appendChild(bubble);
      messagesEl.appendChild(msg);
      if (withRating && (role === 'bot' || role === 'admin')) {
        addRating(msg);
      }
      scrollBottom();
      if (role !== 'user') incrementUnread();
      return bubble;
    }

    function addTyping() {
      const msg = document.createElement('div');
      msg.className = 'aw-msg bot'; msg.id = 'aw-typing';
      msg.innerHTML = '<div class="aw-bubble aw-typing"><span></span><span></span><span></span></div>';
      messagesEl.appendChild(msg);
      scrollBottom();
    }

    function removeTyping() { const el = document.getElementById('aw-typing'); if (el) el.remove(); }
    function scrollBottom() { messagesEl.scrollTop = messagesEl.scrollHeight; }

    // ── Report button ─────────────────────────────────────────────────────────
    reportBtn.addEventListener('click', function () {
      inputEl.value = t.reportTemplate;
      inputEl.style.height = 'auto';
      inputEl.style.height = Math.min(inputEl.scrollHeight, 90) + 'px';
      inputEl.focus();
      // Put cursor at end
      inputEl.selectionStart = inputEl.selectionEnd = inputEl.value.length;
    });

    // ── Bot mode: poll for admin replies ─────────────────────────────────────
    function startPolling() {
      if (!BOT_MODE || pollTimer) return;
      pollTimer = setInterval(async () => {
        try {
          const res = await fetch(`${BOT_URL}/widget/poll?session=${encodeURIComponent(SESSION_ID)}`);
          if (!res.ok) return;
          const data = await res.json();
          if (data.reply) {
            addMessage(data.reply, 'admin', true);
          }
        } catch {}
      }, 3000);
    }

    function stopPolling() {
      if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
    }

    function togglePanel() {
      isOpen = !isOpen;
      panel.classList.toggle('open', isOpen);
      btn.innerHTML = isOpen ? ICON_CLOSE : ICON_CHAT;
      if (isOpen) {
        clearUnread();
        if (messagesEl.children.length === 0) {
          addMessage(t.welcome, 'bot', false);
          clearUnread(); // welcome message doesn't count
        }
        setTimeout(() => inputEl.focus(), 220);
        if (BOT_MODE) startPolling();
      } else {
        stopPolling();
      }
    }

    // ── Send via BOT ──────────────────────────────────────────────────────────
    async function sendViaBotMode(text) {
      if (!BOT_URL) { addMessage(t.noBotUrl, 'bot', false); return; }
      isStreaming = true;
      sendBtn.disabled = true;
      addMessage(text, 'user', false);
      history.push({ role: 'user', content: text });
      addTyping();
      try {
        const resp = await fetch(`${BOT_URL}/widget/message`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: SESSION_ID, message: text, lang: LANG }),
        });
        removeTyping();
        if (!resp.ok) {
          const err = await resp.json().catch(() => ({}));
          addMessage(t.errorMsg(err?.error || resp.status, TG_LINK), 'bot', false);
          history.pop(); return;
        }
        const data = await resp.json();
        if (data.reply) {
          addMessage(data.reply, 'bot', true);
          history.push({ role: 'assistant', content: data.reply });
        }
      } catch {
        removeTyping();
        addMessage(t.connectErr(TG_LINK), 'bot', false);
        history.pop();
      } finally {
        isStreaming = false;
        sendBtn.disabled = false;
        scrollBottom();
      }
    }

    // ── Send via direct APINET API (streaming) ────────────────────────────────
    async function sendViaDirectMode(text) {
      if (!API_TOKEN || API_TOKEN === 'WIDGET_TOKEN_PLACEHOLDER') {
        addMessage(t.noToken, 'bot', false); return;
      }
      isStreaming = true;
      sendBtn.disabled = true;
      addMessage(text, 'user', false);
      history.push({ role: 'user', content: text });
      addTyping();
      try {
        const resp = await fetch(`${API_BASE}/v1/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_TOKEN}` },
          body: JSON.stringify({
            model: MODEL,
            messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...history.slice(-10)],
            stream: true, max_tokens: 1024, temperature: 0.5,
          }),
        });
        if (!resp.ok) {
          const err = await resp.json().catch(() => ({}));
          removeTyping();
          addMessage(t.errorMsg(err?.error?.code || resp.status, TG_LINK), 'bot', false);
          history.pop(); return;
        }
        removeTyping();
        const bubble = addMessage('', 'bot', false);
        // Get the parent msg element to add rating after streaming
        const msgEl = bubble.parentElement;
        let fullText = '';
        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          for (const line of decoder.decode(value, { stream: true }).split('\n')) {
            if (!line.startsWith('data: ')) continue;
            const raw = line.slice(6).trim();
            if (raw === '[DONE]') break;
            try {
              const delta = JSON.parse(raw)?.choices?.[0]?.delta?.content;
              if (delta) { fullText += delta; bubble.innerHTML = renderMarkdown(fullText); scrollBottom(); }
            } catch {}
          }
        }
        if (fullText) {
          history.push({ role: 'assistant', content: fullText });
          addRating(msgEl);
        }
      } catch {
        removeTyping();
        addMessage(t.connectErr(TG_LINK), 'bot', false);
        history.pop();
      } finally {
        isStreaming = false;
        sendBtn.disabled = false;
        scrollBottom();
      }
    }

    function sendMessage(text) {
      if (!text.trim() || isStreaming) return;
      // Hide chips once user starts chatting
      chipsEl.style.display = 'none';
      if (BOT_MODE) sendViaBotMode(text);
      else          sendViaDirectMode(text);
    }

    inputEl.addEventListener('input', function () {
      this.style.height = 'auto';
      this.style.height = Math.min(this.scrollHeight, 90) + 'px';
      // Show chips again if input is cleared
      if (!this.value.trim() && messagesEl.children.length <= 1) {
        chipsEl.style.display = '';
      }
    });
    inputEl.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const v = this.value.trim();
        if (v) { this.value = ''; this.style.height = 'auto'; sendMessage(v); }
      }
    });
    sendBtn.addEventListener('click', () => {
      const v = inputEl.value.trim();
      if (v) { inputEl.value = ''; inputEl.style.height = 'auto'; sendMessage(v); }
    });
    btn.addEventListener('click', togglePanel);
    panel.querySelector('.aw-close').addEventListener('click', togglePanel);
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && isOpen) togglePanel(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
