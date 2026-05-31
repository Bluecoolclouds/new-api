---
name: Authentication
description: Login methods, OAuth providers (GitHub, Discord, Telegram, LinuxDO, WeChat, OIDC), two-factor authentication (2FA/TOTP), Passkeys (WebAuthn), and session issues.
---

# Authentication

## Login Methods

APINET.CLOUD supports multiple ways to sign in:

### Username & Password
- Standard login at `/login`
- Default root account: `root` / `123456` (change immediately after setup)

### OAuth (Social Login)
Supported providers (admin must enable and configure each):

| Provider | Setup Required |
|---|---|
| GitHub | GitHub OAuth App (Client ID + Secret) |
| Discord | Discord Application (Client ID + Secret) |
| Telegram | Telegram Bot Token |
| LinuxDO | LinuxDO OAuth credentials |
| WeChat | WeChat Official Account (China) |
| OIDC | Any OpenID Connect provider (Client ID + Secret + Issuer URL) |

**"OAuth login not working"**
1. Admin must enable the provider in System Settings → OAuth
2. Callback URL must be set in the OAuth app to: `https://<your-domain>/oauth/<provider>/callback`
3. Check that Client ID and Secret are correct in system settings

### Passkeys (WebAuthn)
- Password-free login using biometrics or security keys
- Set up in: Profile → Security → Add Passkey
- Requires HTTPS (works on Replit, not localhost without special config)

## Two-Factor Authentication (2FA)

### Setting Up TOTP
1. Profile → Security → Enable 2FA
2. Scan the QR code with an authenticator app (Google Authenticator, Authy, etc.)
3. Enter the 6-digit code to confirm
4. Save backup codes in a safe place

### Backup Codes
- Generated when 2FA is first enabled
- Each code is single-use
- If you lose your authenticator, use a backup code at login
- Regenerate codes in: Profile → Security → Backup Codes

### Lost 2FA Access (Admin reset)
- Admin: Users → find the user → Edit → Disable 2FA
- Root: can reset any user's 2FA from the admin panel

## Session Issues

### "Session expired" / Logged out frequently
- Sessions are signed with `SESSION_SECRET`
- If `SESSION_SECRET` changes (app restart without a fixed secret), all sessions are invalidated
- **Fix (admin):** Set a fixed `SESSION_SECRET` environment variable

### Multi-node / Load balancer issues
- Sessions may not work across multiple instances without a shared session store
- **Fix:** Set `REDIS_CONN_STRING` to enable Redis-backed sessions, and use a consistent `SESSION_SECRET`

### Can't log in after password change
- Wait a moment — password changes take effect immediately
- Clear browser cookies for the domain
- Try a private/incognito window

## User Registration

Whether new users can register is controlled by admin:
- **System Settings → Operations → Registration**
- Options: Open (anyone can register), Closed (invite only), Email verification required

**"Registration is closed"**
→ Ask an admin to create your account manually, or enable registration in settings.

**Email verification not arriving**
→ Admin may need to configure SMTP settings in System Settings → Email.
