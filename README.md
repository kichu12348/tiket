# Tiket — environment setup

Tiket runs as two apps: a Next.js frontend and a Bun/Fastify backend with PostgreSQL. Start with the local setup below, then configure the integrations you need.

## 1. Prerequisites

- Bun 1.4.3 (the version used in CI).
- Node.js 24 for the frontend.
- A running PostgreSQL database and credentials with permission to apply migrations.
- For complete functionality: a platform Razorpay account, Brevo sender, private Cloudflare R2 bucket, and an image/CDN service. Google Maps configuration is needed for the location picker.

## 2. Create your environment files

Run these PowerShell commands from the repository root. Existing environment files are preserved.

```powershell
if (!(Test-Path -LiteralPath 'tiket-backend/.env')) {
    Copy-Item -LiteralPath 'tiket-backend/.env.example' -Destination 'tiket-backend/.env'
}
if (!(Test-Path -LiteralPath 'tiket-frontend/.env.local')) {
    Copy-Item -LiteralPath 'tiket-frontend/.env.example' -Destination 'tiket-frontend/.env.local'
}
```

Edit `tiket-backend/.env` and `tiket-frontend/.env.local`. Example values are placeholders; copying them does not provision a database or external services. Keep real environment files out of Git.

Generate a random secret with:

```powershell
bun -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Run it separately for `JWT_SECRET` and `CREDENTIAL_ENCRYPTION_KEY`; use different values.

### Backend: `tiket-backend/.env`

| Variable | What to set |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string, e.g. `postgres://USER:PASSWORD@127.0.0.1:5432/tiket_development`. Create the database first. URL-encode special characters in credentials; use your database provider's required TLS settings. |
| `JWT_SECRET` | Random signing secret generated above. Required for authentication. Changing it invalidates existing tokens. |
| `PORT` | `3001` locally, or the port assigned by your host. |
| `HOST` | `127.0.0.1` locally; typically `0.0.0.0` inside a deployed container. |
| `DEBUG` | `false` normally; `true` enables development logging. |
| `FRONTEND_URL` | Exact allowed frontend origins, comma-separated, without trailing slashes. Locally: `http://localhost:3000`. The first origin is also used for email links. |
| `CDN_URL` | Base URL of the existing image/CDN service; see the CDN section below. |

The remaining backend variables enable payments, email and registration-file storage; they are documented below. Basic password authentication and non-provider flows can be developed before those services are configured. OTP login needs working email delivery, paid checkout needs Razorpay, and registration file uploads need R2.

### Frontend: `tiket-frontend/.env.local`

| Variable | What to set |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | `http://127.0.0.1:3001` locally. Use the backend base URL, without `/api` or a trailing slash. |
| `NEXT_PUBLIC_CDN_URL` | Public base URL of the image/CDN service. |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Browser Google Maps key for the location picker. |
| `NEXT_PUBLIC_MAP_ID` | Google Maps map ID used by the map/advanced markers. This is separate from the API key. |

All `NEXT_PUBLIC_*` values are visible in the browser and embedded during the frontend build. Never put Razorpay secrets, database credentials, mail credentials, encryption keys or R2 credentials here. Rebuild/redeploy the frontend after changing these values; restart the backend after changing its configuration.

## 3. Install, migrate and run

In one terminal, from the repository root:

```powershell
cd tiket-backend
bun install --frozen-lockfile
bun run db:migrate
bun run dev
```

Use a fresh database for first-time setup. Apply the checked-in migrations with `db:migrate`: the baseline includes custom financial snapshot triggers that `db:push` does not install. Do not reset an existing database as part of routine setup.

In a second terminal, from the repository root:

```powershell
cd tiket-frontend
bun install --frozen-lockfile
bun run dev
```

Open <http://localhost:3000>. The API listens on <http://127.0.0.1:3001> by default. If you instead open the frontend at `http://127.0.0.1:3000`, include that exact origin in backend `FRONTEND_URL`, for example:

```dotenv
FRONTEND_URL=http://localhost:3000,http://127.0.0.1:3000
```

## 4. Razorpay payments and refunds

Use one platform Razorpay account. Organizer-specific Razorpay credentials are not supported.

| Backend variable | What to set |
| --- | --- |
| `RAZORPAY_KEY_ID` | Platform API key ID for the selected test/live environment. |
| `RAZORPAY_KEY_SECRET` | Matching API key secret. Backend only. |
| `RAZORPAY_WEBHOOK_SECRET` | Secret chosen when configuring the webhook. This is separate from the API key secret. |
| `RAZORPAY_ACCOUNT_ID` | Optional account ID; when set, webhook account identity is checked. |

Start in Razorpay test mode. Configure automatic payment capture and register this publicly reachable HTTPS webhook:

```text
https://YOUR_API_DOMAIN/api/payments/webhook
```

Subscribe to `payment.captured`, `payment.failed`, `order.paid`, `refund.created`, `refund.processed`, and `refund.failed`. Configure the same webhook secret in Razorpay and the backend.

For local development, use an allowed HTTPS tunnel forwarding to backend port 3001, or deploy a staging API. Razorpay cannot deliver to localhost and blocks some tunnel domains. Preserve the exact request body and the `X-Razorpay-Signature` and `X-Razorpay-Event-Id` headers through any proxy. See [Razorpay webhook testing and validation](https://razorpay.com/docs/webhooks/validate-test/).

Use separate databases, API keys and webhook secrets for test and live environments. Checkout signature verification alone does not make a ticket admissible: captured payment confirmation is required. Full and partial refunds are initiated from organizer Operations using the platform account.

### Pricing configuration

Keep fees and taxes at zero until an appropriate business policy is established. Amounts are integer paise; 100 paise = ₹1. Rates use basis points; 100 BPS = 1%.

| Backend variable | Default | Meaning |
| --- | --- | --- |
| `PRICING_POLICY_VERSION` | `zero-v1` | Policy label saved in immutable order pricing snapshots. Change when the policy changes. |
| `TICKET_TAX_BPS` | `0` | Tax rate on the discounted ticket price. |
| `PLATFORM_FEE_BPS` | `0` | Percentage platform fee. |
| `PLATFORM_FEE_PAISE` | `0` | Fixed platform fee per nonzero ticket line, not per order. |
| `FEE_TAX_BPS` | `0` | Tax rate on the platform fee. |

Configured fees and taxes are added on top of the discounted ticket price. Fully discounted/free tickets do not incur platform fees. Existing order snapshots retain their original pricing when configuration changes.

## 5. Brevo email and organizer overrides

Create a Brevo transactional API key and verify the sender/domain you intend to use. See [Brevo's transactional email setup](https://developers.brevo.com/docs/send-a-transactional-email).

| Backend variable | What to set |
| --- | --- |
| `BREVO_API_KEY` | Platform transactional email API key. |
| `EMAIL_FROM` | Verified sender email address. |
| `EMAIL_FROM_NAME` | Sender display name; defaults to `Tiket`. |
| `CREDENTIAL_ENCRYPTION_KEY` | Exactly 64 hexadecimal characters representing 32 random bytes. Encrypts saved organizer provider credentials. |

Retain the encryption key across deployments. Rotating it requires re-encrypting existing saved connections. Back it up securely alongside the database configuration.

The platform sender handles OTP emails. Organizers can configure their own Brevo or SMTP credentials through **Operations → Email delivery**; that override applies to events they own. Custom SMTP must use a publicly reachable server with TLS on a supported port (465, 587 or 2525). Email delivery also depends on the backend background jobs remaining running.

## 6. Cloudflare R2 registration files

Create a private R2 bucket and bucket-scoped S3-compatible credentials with object read/write permissions. These credentials support upload, metadata checks, copy and authorized downloads.

| Backend variable | What to set |
| --- | --- |
| `R2_ACCOUNT_ID` | Cloudflare account ID. |
| `R2_ACCESS_KEY_ID` | R2 S3-compatible access key ID. |
| `R2_SECRET_ACCESS_KEY` | Matching S3-compatible secret access key. |
| `R2_BUCKET` | Exact private bucket name. |

The backend constructs the S3 endpoint from the account ID; no additional endpoint variable is needed. Users upload directly from the browser with short-lived presigned URLs. Do not make the bucket public or place these credentials in frontend configuration.

Configure bucket CORS for the exact frontend origins. Local example:

```json
[
  {
    "AllowedOrigins": ["http://localhost:3000", "http://127.0.0.1:3000"],
    "AllowedMethods": ["PUT"],
    "AllowedHeaders": ["Content-Type"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

Add the deployed HTTPS frontend origin for production. See [Cloudflare R2 CORS configuration](https://developers.cloudflare.com/r2/buckets/cors/).

Set a lifecycle rule to remove objects under `staging/` after one day. Do not apply that expiry to finalized registration files. Current registration uploads support PDF, PNG, JPEG and plain text up to 10 MB. Rehearse an upload and authorized download using your actual bucket before launch.

## 7. Event images/CDN and Google Maps

### Image/CDN service

`CDN_URL` and `NEXT_PUBLIC_CDN_URL` refer to the existing image service, separately from the private R2 registration-file bucket. The current integration expects:

- Backend: `POST {CDN_URL}/generate-url` with `{ "filename": "..." }`, returning an upload `url` and `max_size`.
- Frontend: images available at `{NEXT_PUBLIC_CDN_URL}/image/{filename}`, with optional image transformation query parameters.

The example `http://localhost:3001` CDN values are placeholders. The API does not itself provide this image service; supply a compatible service URL for event image uploads and rendering. Pointing these variables at the R2 bucket alone does not provide that contract.

### Google Maps

Provide a browser Maps API key and a map ID from your Google Cloud project. Configure Maps JavaScript/Places access for the location-picker features and the project's required billing settings. Restrict the browser key to the APIs and HTTP referrers your app uses, including the local development origins and deployed frontend domain. Empty Maps configuration leaves the map/location picker unavailable.

## 8. Production deployment

1. Deploy `tiket-frontend/` as a standard Next.js project on Vercel. Set the four frontend variables in the appropriate Vercel environments before building.
2. Deploy `tiket-backend/` on a persistent Bun process host with `bun run start`. Set backend secrets there, including `NODE_ENV=production`, the database URL, allowed frontend origins and provider settings. Set `HOST=0.0.0.0` when required by the host.
3. Apply `bun run db:migrate` as a controlled deployment step before serving the new application version.
4. Use HTTPS API/frontend URLs and update Razorpay webhooks, R2 CORS and Maps key restrictions for those domains.
5. Enable WebSocket upgrades at `/api/realtime/ws`. Keep the backend process running so reservation cleanup, payment/refund reconciliation and email delivery jobs execute. This backend should not run in Vercel request functions.
6. Keep all API instances on the same PostgreSQL database. Current realtime propagation uses PostgreSQL; no Redis environment variable is required.

See the [implementation runbook](planning/implementation-runbook.md) for operational checks, recovery procedures and remaining parity work.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| API connection refused locally | Start the backend; use `127.0.0.1:3001` when it binds IPv4. `localhost` can resolve to IPv6 on Windows. |
| CORS or WebSocket origin rejected | Match the browser's exact origin in `FRONTEND_URL`, including scheme and port, without a trailing slash. Restart the backend. |
| Database connection/migration failure | Confirm PostgreSQL is running, the database exists, credentials are correct and the connection's TLS settings match the provider. |
| Paid checkout unavailable | Configure platform Razorpay keys; verify test/live mode matches the webhook environment. |
| OTP or transactional email missing | Check Brevo key, verified sender, provider logs and backend delivery jobs. |
| Saved organizer email credentials cannot decrypt | Restore the original `CREDENTIAL_ENCRYPTION_KEY`; a newly generated key cannot decrypt old connections. |
| Registration upload unavailable or blocked | Check all four R2 variables, bucket permissions, exact-origin CORS and the presigned URL's expiry. |
| Event images do not load/upload | Configure the separate compatible image/CDN service; the API URL is only a placeholder in the examples. |
| Updated frontend configuration has no effect | Restart local Next.js development, or rebuild/redeploy production; public variables are embedded at build time. |

Only example environment files belong in Git. Share variable names and redacted errors when troubleshooting, never actual credentials or presigned URLs.
