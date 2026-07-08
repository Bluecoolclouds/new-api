# APINET.CLOUD — Integration API Guide

Документация для разработчиков внешних сервисов, которые используют APINET как бэкенд для пользователей и биллинга.

---

## Архитектура интеграции

Внешний сервис регистрирует пользователей у себя. При каждой регистрации — программно создаёт аккаунт в APINET и сохраняет у себя `apinet_user_id` и `apinet_api_key` пользователя. Все LLM-запросы и биллинг идут через APINET под этим ключом.

```
Пользователь → Ваш сервис (регистрация, логин, UI)
                     ↓
               APINET Admin API (создание аккаунта)
                     ↓
               APINET как LLM-шлюз (запросы, списание баланса)
```

---

## Базовые параметры

| Параметр | Значение |
|---|---|
| Base URL | `https://apinet.cloud` |
| Auth header | `Authorization: Bearer <admin_access_token>` |
| Content-Type | `application/json` |

---

## Единицы квоты (баланс)

APINET хранит баланс в **условных единицах (credits)**:

```
1 USD = 500 000 credits (QuotaPerUnit = 500,000)
```

Примеры:
- $1.00 → `500000` credits
- $5.00 → `2500000` credits
- $10.00 → `5000000` credits

---

## Роли пользователей

| Роль | Код | Описание |
|---|---|---|
| Обычный пользователь | `1` | Стандартный клиент |
| Администратор | `10` | Может управлять пользователями |
| Root | `100` | Суперадмин (только 1 в системе) |

---

## Авторизация — получение Admin Access Token

`access_token` — это токен для управления через API (не API-ключ для LLM). Генерируется один раз через UI или API, хранится в сервисе как секрет.

### Получить через UI

1. Войти в APINET как admin → Профиль → "Системный токен" → Скопировать

### Получить программно (нужна сессия)

```http
POST /api/user/login
Content-Type: application/json

{
  "username": "admin",
  "password": "your_password"
}
```

После логина (сессионная кука) — вызвать:

```http
GET /api/user/token
Cookie: <session_cookie>
```

**Ответ:**
```json
{
  "success": true,
  "data": "ak-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
}
```

Сохранить этот токен как `APINET_ADMIN_TOKEN` в секретах вашего сервиса.

---

## 1. Создание пользователя

```http
POST /api/user/
Authorization: Bearer <admin_access_token>
Content-Type: application/json

{
  "username": "user_abc123",
  "password": "SecurePass1!",
  "display_name": "Иван Иванов",
  "role": 1
}
```

**Поля:**

| Поле | Обязательно | Ограничения | Описание |
|---|---|---|---|
| `username` | ✅ | max 20 символов, уникальный | Логин |
| `password` | ✅ | min 8, max 20 символов | Пароль |
| `display_name` | нет | max 20 символов | Отображаемое имя |
| `role` | нет | 1 или 10 (не выше роли вызывающего) | По умолчанию: 1 |

**Ответ:**
```json
{
  "success": true,
  "message": ""
}
```

> ⚠️ После создания нужно узнать ID нового пользователя — через поиск по username.

---

## 2. Поиск пользователя (получить ID)

```http
GET /api/user/search?keyword=user_abc123
Authorization: Bearer <admin_access_token>
```

**Ответ:**
```json
{
  "success": true,
  "data": [
    {
      "id": 42,
      "username": "user_abc123",
      "display_name": "Иван Иванов",
      "role": 1,
      "status": 1,
      "quota": 0,
      "used_quota": 0,
      "group": "default"
    }
  ]
}
```

---

## 3. Получить данные пользователя

```http
GET /api/user/{id}
Authorization: Bearer <admin_access_token>
```

**Ответ:**
```json
{
  "success": true,
  "data": {
    "id": 42,
    "username": "user_abc123",
    "display_name": "Иван Иванов",
    "role": 1,
    "status": 1,
    "quota": 1000000,
    "used_quota": 50000,
    "group": "default",
    "email": "user@example.com",
    "aff_quota": 0,
    "aff_history_quota": 0
  }
}
```

---

## 4. Управление квотой (баланс)

```http
POST /api/user/manage
Authorization: Bearer <admin_access_token>
Content-Type: application/json
```

### Пополнить баланс

```json
{
  "id": 42,
  "action": "add_quota",
  "mode": "add",
  "value": 500000
}
```
*Добавляет $1 к балансу пользователя.*

### Списать баланс

```json
{
  "id": 42,
  "action": "add_quota",
  "mode": "subtract",
  "value": 500000
}
```

### Установить баланс точно

```json
{
  "id": 42,
  "action": "add_quota",
  "mode": "override",
  "value": 2500000
}
```
*Устанавливает баланс ровно $5.*

### Заблокировать пользователя

```json
{
  "id": 42,
  "action": "disable"
}
```

### Разблокировать

```json
{
  "id": 42,
  "action": "enable"
}
```

### Удалить пользователя

```json
{
  "id": 42,
  "action": "delete"
}
```

**Ответ** (все действия):
```json
{
  "success": true,
  "message": ""
}
```

---

## 5. Создание API-ключа для пользователя

API-ключи (для LLM-запросов, вида `sk-...`) создаются от имени самого пользователя, не от имени admin. Поэтому нужна аутентификация как этот пользователь.

### Способ A — через access_token пользователя (рекомендован)

**Шаг 1.** Сгенерировать access_token для пользователя. Это делается при логине под пользователем + вызов `/api/user/token`. Для автоматизации — лучше создавать token сразу после создания аккаунта, пока у сервиса есть пароль.

**Шаг 2.** Создать LLM API-ключ:

```http
POST /api/token/
Authorization: Bearer <user_access_token>
Content-Type: application/json

{
  "name": "main",
  "expired_time": -1,
  "remain_quota": 0,
  "unlimited_quota": true,
  "model_limits_enabled": false
}
```

**Ответ:**
```json
{
  "success": true,
  "message": "",
  "data": {
    "id": 101,
    "key": "sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
  }
}
```

Сохранить `key` как `apinet_api_key` пользователя в вашей БД.

### Способ B — единый сервисный ключ (упрощённо)

Если не нужна изоляция бюджета по пользователям — создайте один APINET API-ключ для всего сервиса. Передавайте `user: "user_id"` в каждом LLM-запросе для трекинга.

```json
{
  "model": "gpt-4o",
  "user": "your_service_user_id_42",
  "messages": [...]
}
```

---

## 6. LLM-запросы через APINET

APINET полностью совместим с OpenAI API:

```http
POST /v1/chat/completions
Authorization: Bearer sk-xxxxxxxxxxxxxxxxxxxxxxxx
Content-Type: application/json

{
  "model": "gpt-4o",
  "messages": [
    {"role": "user", "content": "Привет!"}
  ],
  "stream": false
}
```

Поддерживаемые эндпойнты: `/v1/chat/completions`, `/v1/completions`, `/v1/embeddings`, `/v1/images/generations`, `/v1/audio/transcriptions`, `/v1/models`

---

## 7. Список всех пользователей (для синхронизации)

```http
GET /api/user/?page=1&page_size=50
Authorization: Bearer <admin_access_token>
```

---

## Типичный флоу регистрации (псевдокод)

```python
def register_user(username, password, display_name, initial_balance_usd=0):
    # 1. Создать аккаунт в APINET
    res = apinet.post("/api/user/", {
        "username": f"svc_{username}",  # префикс чтобы не конфликтовало
        "password": password,
        "display_name": display_name,
        "role": 1
    })
    
    # 2. Найти ID нового пользователя
    user = apinet.get(f"/api/user/search?keyword=svc_{username}").data[0]
    apinet_user_id = user["id"]
    
    # 3. Начислить стартовый баланс (если есть)
    if initial_balance_usd > 0:
        apinet.post("/api/user/manage", {
            "id": apinet_user_id,
            "action": "add_quota",
            "mode": "add",
            "value": int(initial_balance_usd * 500_000)
        })
    
    # 4. Залогиниться как пользователь и создать API-ключ
    session = apinet.post("/api/user/login", {"username": f"svc_{username}", "password": password})
    access_token = apinet.get("/api/user/token", cookies=session.cookies).data
    
    api_key = apinet.post("/api/token/", {
        "name": "main",
        "expired_time": -1,
        "unlimited_quota": True
    }, headers={"Authorization": f"Bearer {access_token}"}).data["key"]
    
    # 5. Сохранить в вашей БД
    db.save_user(
        local_user_id=username,
        apinet_user_id=apinet_user_id,
        apinet_api_key=api_key
    )
    
    return api_key
```

---

## Обработка ошибок

Все ошибки возвращают HTTP 200 с телом:

```json
{
  "success": false,
  "message": "описание ошибки"
}
```

Частые ошибки:

| Сообщение | Причина |
|---|---|
| `user already exists` | Дублирование username |
| `invalid params` | Неверный формат / пустые обязательные поля |
| `password length must be 8-20` | Нарушение валидации пароля |
| `you cannot create a user with a higher role` | Попытка создать admin от имени non-root |
| `user not found` | Неверный ID в manage-запросе |

---

## Рекомендации

1. **Именование**: используйте префикс для username (`svc_`, `ext_`) чтобы визуально отделить API-созданных пользователей от ручных в admin-панели
2. **Хранить**: `apinet_user_id` (для управления балансом) + `apinet_api_key` (для LLM-запросов)
3. **Безопасность**: `APINET_ADMIN_TOKEN` хранить только в переменных окружения сервера, не в клиентском коде
4. **Rate limits**: APINET имеет rate limiting — при массовом создании добавьте паузу между запросами (50-100ms)
5. **Баланс**: квота пользователя = 0 по умолчанию. Начислите стартовый баланс при регистрации если нужно
