# Tiket

An event-ticketing / event-management platform (think Luma/Eventbrite). Organizers create events, sell/issue ticket types, build custom registration forms, manage teams with granular roles, check attendees in via QR, transfer/refund tickets, and generate ticket & certificate documents.

This is a **monorepo-style split** of two independently-versioned apps (each has its own `.git`):

- `tiket-frontend/` — Next.js 16 (App Router) UI
- `tiket-backend/` — Bun + Fastify + Drizzle REST API

> Authoritative conventions live in `CODEBASE_STANDARDS.md`. Read those before non-trivial work; this file is the map, they are the law.

---

## Backend (`tiket-backend`)

**Stack:** Bun runtime · Fastify 5 · Drizzle ORM · PostgreSQL · `@fastify/jwt` · `@fastify/cors`

### Layout (`src/`)

- `index.ts` — Fastify bootstrap. Registers CORS (allows `http://localhost:3000`), JWT (`JWT_SECRET`), and mounts every route module under an `/api/...` prefix.
- `routes/*.routes.ts` — **lean** route definitions. Bind a Fastify JSON schema + controller method per route, nothing else. e.g. `fastify.post("/", createEventSchema, createEvent)`.
- `controllers/*.controller.ts` — all business logic, Drizzle queries, and HTTP responses.
- `_schemas/*.schema.ts` — pure JSON Schema objects for Fastify request validation (body/params/query). Attached at the route level so validation runs before controllers.
- `db/schema.ts` — Drizzle table + enum + relations definitions (single source of truth for the data model).
- `db/index.ts` — Drizzle client (`import db from "@db"`).
- `utils/verifyOwner.ts` — `verifyEventOwner(eventId, userId)` / `verifyOwnerByTemplateId(...)` ownership guards used throughout controllers.

**Path aliases:** `@routes/*`, `@controllers/*`, `@schemas/*`, `@db`, `@db/schema` (see `tsconfig.json`).

### API surface (route prefixes registered in `index.ts`)

`/api/auth`, `/api/events`, `/api/teams`, `/api/ticket-types`, `/api/forms`, `/api/orders`, `/api/tickets` (transfers), `/api/check-ins`, `/api/templates`.

### Auth model

- JWT bearer tokens, 30-day expiry, signed via `reply.jwtSign({ id, email, type })`.
- Passwords hashed with `Bun.password`. Email OTP flow also supported (6-digit, 10-min expiry, **currently logged to console in dev — no mailer wired up**).
- Protected controllers call `await request.jwtVerify()` then read `request.user`. There is **no global auth hook** — each protected handler verifies individually.

### Conventions

- Standard error shape everywhere: `{ "error": "string" }` with proper status (400/401/404/500).
- RESTful verbs + status codes. Files are kebab-case with a type suffix (`event.controller.ts`).

### Commands (run inside `tiket-backend/`)

```bash
bun run dev        # watch mode (src/index.ts)
bun run start      # run once
bun run build      # build.ts
bun run db:generate  # generate migration from schema.ts
bun run db:push      # push schema to DB
bun run db:migrate   # apply migrations
bun run db:studio    # Drizzle Studio
bun run db:init      # generate + push
```

Migrations live in `drizzle/`. Env: `DATABASE_URL`, `JWT_SECRET`, `PORT`, `DEBUG`, `CDN_URL` (see `.env.example`).

---

## Frontend (`tiket-frontend`)

**Stack:** Next.js 16 App Router (React 19, heavy Client Components) · TypeScript · Zustand · axios · Framer Motion · dnd-kit (drag/drop) · Tiptap/Novel (rich text) · `@vis.gl/react-google-maps` · sonner (toasts) · isomorphic-dompurify.

> ⚠️ **Styling is contested between the two spec docs.** `AGENTS.md` says CSS Modules **only**, Tailwind strictly prohibited. `CODEBASE_STANDARDS.md` allows CSS Modules **plus** Tailwind utilities + `cn()`. The actual code uses **both** (Tailwind v4 is installed; `app/layout.tsx` uses Tailwind classes; components use `*.module.css`). In practice: structural styling → CSS Modules; quick utilities → Tailwind + `cn()`. Colors must come from CSS variables in `app/globals.css` (soft-UI / glassmorphism design language) — no hardcoded hex/rgb in modules.

### Layout

- `app/` — App Router routes. Notable pages:
  - `/` landing, `/signin`, `/home` (organizer dashboard), `/create` (new event)
  - `/edit/[eventId]/{overview,details,tickets,forms,team,settings}` — the event editor (each sub-route has local `components/`, some have local `hooks/`, `functions/`, `types.ts`)
  - `/[eventSlug]` — public event page; `/passes/[ticketId]` — attendee ticket/pass view
  - `app/api/auth/*` — **Next route handlers acting as a BFF**: they proxy auth calls to the backend and set/clear the `authToken` **httpOnly cookie**.
- `components/` — shared components. Each complex one is a folder with `index.tsx` + `PascalCase.module.css` (e.g. `LocationPicker`, `DateRangeBlock`, `DescriptionEditor`, `Modal`, `Navbar`, `SidebarNav`). `components/ui/` holds base primitives.
- `store/` — Zustand stores (`useEventStore.ts` with optimistic `updateEventLocally`, `useSidebarStore.ts`).
- `api/` — direct backend call wrappers (`events.ts`, `forms.ts`, `team.ts`, `tickets.ts`) consumed by UI.
- `lib/` — `api.ts` (axios instance), `getToken.ts` (server action reading the cookie), `color.ts`, `utils.ts` (`cn`), `validators/` (pure payload validation before submit).
- `constants/config.ts` — **all** env vars + endpoint paths. `API_ENDPOINTS` object; dynamic routes are functions (`UPDATE: (id) => ...`). Never hardcode endpoint strings in `api/`.
- `hooks/`, `actions/`, `types/` — cross-cutting hooks, server actions (`removeToken`), shared TS types.
- `proxy.ts` — Next 16's renamed middleware. Guards `/home`,`/create`,`/edit/*` (redirect to `/signin` if no token), and bounces authed users away from `/` and `/signin`.

### Auth flow (two token paths — important)

1. **BFF cookie path (auth pages):** UI → `app/api/auth/*` route handler → backend → route handler stores the JWT in an **httpOnly `authToken` cookie**. `proxy.ts` and `lib/getToken.ts` read this cookie.
2. **Direct API path (app data):** `lib/api.ts` axios instance pulls the token via the `getToken` server action and sends `Authorization: Bearer <token>`. On `401` it clears the token and redirects to `/signin`.

### Commands (run inside `tiket-frontend/`)

```bash
bun run dev     # next dev (localhost:3000)
bun run build   # next build
bun run start   # next start
bun run lint    # eslint
```

Env (`NEXT_PUBLIC_*`): `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_CDN_URL`, `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`, `NEXT_PUBLIC_MAP_ID`.

---

## Data model (Postgres via Drizzle — `tiket-backend/src/db/schema.ts`)

Core entities and how they connect:

- **users** — individual or organization (`type`), password and/or Google/OTP auth, unique `slug`.
- **events** — owned by a user (`organizationId`). Rich metadata: status (draft/published/completed/cancelled), locationType (online/offline/hybrid) + `locationDetails` jsonb, date/timezone window, registration window, capacity, approval flag, theming (color, fontFamily).
- **Team:** `event_roles` (name + `permissions` jsonb array) → `event_team_members` (user ↔ role per event).
- **Ticketing:** `ticket_types` (price, quantity limit, sale window, refundable/transferable policy, sort order) → `orders` (payment status/provider/intent) → `tickets` (owner `userId`, unique `qrCode`, status, transferCount).
- **Transfers/Refunds:** `ticket_transfers` (from/to user, status) and `refund_requests` (amount, status, reason).
- **Forms:** `form_fields` (typed fields — text/select/file/rating/etc., required, options jsonb, paginated via `page`) → `ticket_form_responses` (per-ticket answers).
- **Documents:** `document_templates` (ticket|certificate, background image + `elementsJson` layout) → `certificates` (issued per user).
- **Check-in:** `check_ins` (ticket + logging team member + timestamp).
- **Automation:** `workflows` (trigger: ticket_purchased/checked_in/event_completed → action: send_email/generate_certificate, `actionConfig` jsonb).

Most FKs cascade on event/order deletion; `ticket_type` and `role` references use `restrict`. Ticket/order/transfer/refund/field/template/workflow states are Postgres enums (see top of `schema.ts`).

---

## Conventions (both apps)

- **Naming:** React components → PascalCase folder + `index.tsx` + `PascalCase.module.css`. Backend files → kebab-case + type suffix. `camelCase` vars/functions, `UPPER_SNAKE_CASE` constants.
- **Types:** Strictly avoid `any` or `as any` casting to bypass type errors — always define explicit interfaces and inspect types beforehand. Types/interfaces MUST always be imported using type-only imports (`import type { ... }` or `import { type ... }`).
- **Endpoints:** frontend never hardcodes paths — always `constants/config.ts`. Backend keeps routes lean; logic lives in controllers.

## Status / gaps to be aware of

- Payments are modeled (orders carry `paymentProvider`/`paymentIntentId`) but no provider is integrated yet.
- OTP emails and workflow `send_email` actions are not wired to a mailer (OTP is console-logged in dev).
- `app/layout.tsx` still has default `create-next-app` metadata (title "Create Next App").
- The two spec docs disagree on Tailwind — see the styling note above; follow existing file patterns when in doubt.
