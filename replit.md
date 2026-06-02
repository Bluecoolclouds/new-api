# APINET.CLOUD — LLM Gateway

## Описание проекта

**APINET.CLOUD** — коммерческий AI API шлюз на базе форка **new-api**. Предоставляет единый OpenAI-совместимый API к 40+ провайдерам (OpenAI, Claude, Gemini, DeepSeek, Azure, AWS Bedrock и др.) с управлением пользователями, биллингом, rate limiting и административной панелью.

Сайт: https://apinet.cloud  
Telegram поддержки: https://t.me/apinet_support

## Тех. стек

- **Backend**: Go 1.22+, Gin, GORM v2
- **Frontend**: React 19, TypeScript, Rsbuild, Tailwind CSS, Base UI
- **БД**: SQLite (dev), MySQL / PostgreSQL (prod)
- **Кеш**: Redis + in-memory
- **Frontend пакетный менеджер**: Bun

## Структура проекта

```
router/            HTTP роутинг (API, relay, web)
controller/        Обработчики запросов
service/           Бизнес-логика
model/             Модели данных (GORM)
relay/             Проксирование AI API
  relay/channel/   Адаптеры провайдеров (openai/, claude/, gemini/, ...)
middleware/        Auth, rate limiting, логирование
setting/           Конфигурация (ratio, model, system)
common/            Утилиты (JSON, crypto, Redis, env)
web/
  web/default/     Основной фронтенд (React 19, Rsbuild)
  web/classic/     Классический фронтенд (React 18, Vite)
widget-bot/        Telegram-бот для поддержки виджета (Node.js)
```

## Билд-цикл (ОБЯЗАТЕЛЬНО)

Любое изменение фронтенда требует ОБОИХ шагов — бинарь Go **встраивает** ассеты:

```bash
cd web/default && DISABLE_ESLINT_PLUGIN=true bun run build
go build -buildvcs=false -o new-api .
# затем restart_workflow "Start application"
```

`widget.js` находится в `web/default/public/` — копируется в dist как есть. При изменениях нужен полный пересбор.

## Кастомные компоненты APINET (защитить при upstream-мержах)

- `web/default/src/features/home/` — лендинг с виджетом, убрана секция "Тарификация моделей"
- `web/default/public/widget.js` — виджет поддержки (прямой режим AI + эскалация к оператору)
- `web/default/index.html` — конфигурация виджета (`window.APINET_WIDGET`)
- `controller/payment_freekassa.go` — FreeKassa платёжный шлюз
- `controller/payment_heleket.go` — Heleket платёжный шлюз
- `controller/payment_pally.go` — Pally платёжный шлюз
- `web/default/src/features/topup/` — UI пополнения с промокодами и RedemptionCodeCard
- `web/default/src/features/wallet/` — кошелёк с виводом средств
- `controller/withdrawal.go` — запросы на вывод средств
- `widget-bot/` — Telegram-бот поддержки (Node.js, SQLite сессии)

## Платёжные шлюзы

### FreeKassa
- Nonce хранится как **signed int32** — использовать Unix seconds (не ms/ns)
- Подпись: `md5(merchantId:amount:secret2:orderId)`

### Heleket
- Подпись: `md5(base64(body) + apiKey)` — **без двоеточия**
- `amount` в топап-API в **USD**, не в кредитах
- `unitPrice` умножается, не делится

### Pally
- Стандартный HMAC webhook

## Виджет поддержки

**Файл:** `web/default/public/widget.js`  
**Конфиг:** `web/default/index.html` → `window.APINET_WIDGET`

Работает в **прямом режиме** (без botUrl): виджет → APINET API → AI модель напрямую.

Возможности:
- Автоматические ответы AI (gpt-5.5)
- Эскалация к оператору: AI пишет `[[OPERATOR]]` → виджет показывает карточку с кнопкой Telegram
- Кнопки-подсказки: AI пишет `[[ACTIONS: Вариант1 | Вариант2]]` → виджет рисует кнопки под ответом
- Кнопка "⚠️ Сообщить о проблеме" → открывает Telegram с историей чата
- 👍/👎 рейтинг ответов
- Бейдж непрочитанных сообщений

Версия виджета в `index.html` (`?v=N`) нужна для сброса кеша браузера при изменениях.

## i18n (интернационализация)

**Frontend:** `web/default/src/i18n/locales/{lang}.json`  
Языки: en, zh, fr, ru, ja, vi  
Ключи — английские строки, файлы используют namespace `translation`:
```json
{ "translation": { "English key": "Перевод" } }
```

**Backend:** `i18n/` (go-i18n, en + zh)

## Правила кодирования (из AGENTS.md)

1. **JSON**: использовать только `common.Marshal` / `common.Unmarshal`, НЕ `encoding/json` напрямую
2. **БД**: совместимость с SQLite + MySQL + PostgreSQL одновременно, предпочитать GORM методы
3. **Frontend**: `bun` как основной пакетный менеджер
4. **Relay DTO**: опциональные поля — pointer types с `omitempty`
5. **Биллинг**: перед изменениями читать `pkg/billingexpr/expr.md`

## Настройки пользователя

- Язык общения: русский
- Не добавлять лишних комментариев в код
- Сохранять существующую структуру проекта
