# AGENTS.md — Tiket

Event ticketing monorepo competing with Lu.ma and MakeMyPass.

- `tiket-backend/`: Bun + Fastify + Drizzle ORM + PostgreSQL
- `tiket-frontend/`: Next.js App Router, Radix/shadcn UI, CSS Modules + Tailwind, Zustand

Deep references (read ONLY when the task needs them):

- UI work: `tiket-frontend/DESIGN_SYSTEM.md`
- Architecture questions: `CODEBASE_STANDARDS.md`

## How to work

1. Read only the files named in the task. Do not grep or read the whole repo. If you need a file that was not named, say which and why, then read just that one.
2. Before editing, check the real types, schemas and function signatures you will touch. Never invent APIs, props, columns or endpoints.
3. For anything touching more than 2 files, write a short plan first, then implement.
4. Make the smallest diff that satisfies the task. No unrelated refactors, renames or formatting changes.
5. If the task conflicts with a rule here, stop and ask instead of choosing silently.
6. Never claim done until the quality gate passes.

## Runtime (strict)

- Use ONLY `bun` and `bunx` (`bun run`, `bun test`, `bun add`, `bunx --bun`).
- NEVER use `npm`, `npx`, `yarn`, `pnpm` or `node`.
- Standard Next.js via `bun --bun next`. Do not use `vinext`.

## Quality gate (must all exit 0, run from repo root)

```
bun run typecheck
bun run lint
bun run test
```

Every new or fixed feature or page needs tests with `bun test`
(frontend: React Testing Library + Happy DOM). Fix failures; never disable or skip tests or lint rules to pass.

## TypeScript

- No `any`, no `as any`. Define interfaces, aliases or generics.
- Types are imported with `import type { ... }` (or inline `type` modifiers).
- Do not "fix" `react-hooks/exhaustive-deps` or `@next/next/no-img-element`; both are off.

## Frontend architecture (`tiket-frontend`)

- Components render UI only. No fetching, business logic or payload shaping.
- Hooks (`hooks/`) own logic, one concern each.
- `lib/validators/` is pure validation only.
- `api/` wrappers only make HTTP calls via the axios instance in `lib/api.ts`, with endpoints from `constants/config.ts` (`API_ENDPOINTS`). No hardcoded paths, no raw `fetch`, no formatting, no store writes.
- Zustand stores (`store/`) hold state and optimistic updates only. No API calls inside actions.
- Pages talk to hooks or stores, not `api/` directly.
- Shared components in `components/` must not import `store/` or `api/`; take data via props or callbacks.
- Complex components live in `PascalCase/index.tsx` + `PascalCase.module.css`.
- Mutation pattern: validate (`lib/validators`) → API wrapper → update store.

## UI rules

- Radix/shadcn primitives from `@/components/ui/` only. Never raw `<select>`, `<input type="radio|checkbox">` or browser popovers. Never make users type tokens, field IDs or option values from memory; use pickers.
- Style: dark glassmorphic soft UI. Colors ONLY from CSS variables in `app/globals.css` (add missing ones to `:root`). No hex or rgb in `.module.css`.
- Cards: `border: none`, translucent background, backdrop blur. Subtle borders only for inputs, inner dividers and modals.
- Back navigation: `<ChevronLeft size={18} />` from `lucide-react`. Never `ArrowLeft`.
- Primary button: solid white, black text. Secondary: soft translucent. Icon buttons: 36x36 soft.
- Scrollable areas use the global `.scrollbar` class.
- Toasts via `sonner`. Rich HTML rendered through `isomorphic-dompurify`.

## Backend architecture (`tiket-backend`)

- Routes (`src/routes/`) stay lean: bind controller + Fastify JSON schema from `src/_schemas/`.
- `src/_schemas/` holds plain JSON Schema objects validated by Fastify's built-in AJV (body, query, params, response). Do not add Zod, TypeBox or other validation libraries. Keep each schema's types in sync with the handler's request types.
- Database tables and types live in `src/db/schema.ts` and `src/db/types.ts`, not in `_schemas/`.
- Controllers (`src/controllers/`) handle HTTP in/out. Multi-step or shared business logic belongs in `src/services/`.
- Errors use `{ "error": "string" }` with correct status codes.
- Zero client trust. The server owns:
  - all pricing (integer paise, from DB records, never client totals)
  - capacity and stock (`lockEvent` / `FOR UPDATE`)
  - permissions (`verifyEventPermission`)
  - payment verification (via the `PaymentGateway` interface, never Razorpay-specific code in controllers)
- `platformFeeBps` lives on `events` (default 400) and is read-only to clients.
- Schema changes need a Drizzle migration. Never edit applied migrations.

## Product decisions (do not violate)

- Each ticket tier owns its template: `templateImageUrl` + `templateConfig` (`canvasWidth`, `canvasHeight`, layers). No event-wide ticket studio tab, no `if/else` on layers.
- Pass page scales the fixed artboard: `scale = containerWidth / canvasWidth` via `ResizeObserver`, `transform-origin: top left`.
- Visibility and eligibility conditions are simple `IF` only: `{ fieldId: string; allowedValues: string[] }`. No `else`. Enforced identically on frontend (`RegistrationForm`) and backend (`validateFormResponses`, `checkout.service.ts`).
- Condition UI: Radix `Select` for the question, `Popover` + `Checkbox` list for values.
- Ticket settings (price, GST, fee toggle, limits, pools, hidden/closed) live in `TicketEditModal`.

## Final report format

When finished, reply with: files changed, what changed (1-3 lines), gate result for all three commands, and anything you were unsure about.
