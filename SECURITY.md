# Security and deployment model

GasStrom contains household consumption data and may optionally process meter photos through Google Gemini. The supported default deployment is a single-user installation on the same device or inside a trusted private network.

## Trust boundaries

- SQLite readings, settings and backups are private application data.
- `GEMINI_API_KEY` is a server-side secret. It must not use a `VITE_` prefix, be stored in SQLite or be returned to the browser.
- Meter photos leave the installation when AI analysis is used and are sent to Google Gemini.
- Weather and location searches contact Open-Meteo directly from the browser.

## Deployment profiles

### Local development

Bind the backend to `127.0.0.1`. Authentication is not required while the service cannot be reached from another machine.

### Trusted private network

Run the application behind an HTTPS reverse proxy and restrict access at the firewall or proxy. Configure `ALLOWED_ORIGINS` with the exact public origin and set a strong `ACCESS_TOKEN`. The login exchanges this token for a 12-hour HttpOnly, SameSite session cookie.

### Public internet

Public binding in production is refused unless `ACCESS_TOKEN` is set or `TRUST_PROXY_AUTH=true` explicitly confirms that an authenticating reverse proxy is the exclusive ingress path. Do not rely on CORS as access control. Keep `COOKIE_SECURE=true` behind HTTPS.

`TRUST_PROXY_AUTH=true` disables the application's own login. Never enable it when clients can bypass the authenticating proxy.

## Secret handling

Set `GEMINI_API_KEY` through the process environment, an orchestrator secret or a mounted secret file. Do not commit real keys. Rotate any key that was previously stored through the browser settings because older application versions returned it from `/api/settings`.

## Backups

`DB_PATH` and `BACKUP_DIR` must point into persistent storage. Backup access is equivalent to database access. Recovery should be tested after deployment and after SQLite upgrades.

Security issues should be reported privately to the repository owner rather than opened with sensitive details in a public issue.
