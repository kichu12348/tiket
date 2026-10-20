# Tiket — Phase 2 audit and completion plan

Audit date: 20 October 2026. Companion: [Phase 1 research](</C:/VS Code/Projects/tiket/planning/2026-10-20-competitor-research.md>).

**Assessment:** Tiket has a substantial organizer and registration prototype, including an initial Razorpay checkout. It is not ready for live paid events. Payment integrity, admission eligibility, concurrent inventory allocation, authorization and frontend buildability are release blockers. Completing Phases 3–5 alone will not establish MakeMyPass feature parity.

**Approval boundary:** This deliverable finishes Phases 1–2. Implementation, dependency installation, database migration and external-service configuration have not begun in this task. The work below is proposed for approval.

## 1. Standards and audit scope

Read the authoritative [CODEBASE_STANDARDS.md](</C:/VS Code/Projects/tiket/CODEBASE_STANDARDS.md>), [DESIGN_SYSTEM.md](</C:/VS Code/Projects/tiket/tiket-frontend/DESIGN_SYSTEM.md>), [EDIT_PAGES_DESIGN_SYSTEM.md](</C:/VS Code/Projects/tiket/tiket-frontend/EDIT_PAGES_DESIGN_SYSTEM.md>) and repository AGENTS.md. The standards file is at the workspace root; the design documents are in the frontend directory.

Implementation constraints carried forward:

- Keep Fastify routes lean, request schemas in `_schemas`, server-side policy/authorization and proper `{ error: string }` responses. Reuse the existing Razorpay/payment service boundary for integration helpers.
- Use explicit types and type-only imports; no `any` escape hatches. Existing violations are audit findings, not permission to introduce more.
- Keep endpoint/environment definitions in `constants/config.ts`; route/container hooks own data operations, pure validators own client validation, API wrappers own transport, stores own state.
- Use CSS Modules for structure and the standards-permitted utilities where appropriate. All new colors come from global tokens. Preserve borderless glass cards, solid-white primary actions, ChevronLeft back navigation, Radix/Shadcn controls and the scrollbar utility. Literal-color examples in the design document do not override the standards' token rule.

Inspected the source inventory across both apps, backend bootstrap/schema/routes/controllers/payment services/utilities/request contracts, frontend auth/BFF/proxy/API/state/types, organizer routes, public registration/pass flows and the shared UI/design foundations. External services and deployed databases were not exercised. Existing `EVALUATION.md` was used as a lead; current findings below were checked against source, and quality commands were rerun.

The supplied repository map describes independent Git repositories, but both `git rev-parse --show-toplevel` calls currently resolve to `C:/VS Code/Projects/tiket`. Separate package boundaries still exist. This affects later branch/diff and migration coordination.

Pre-existing local changes include backend package/lock/schema edits and untracked money, permission, error, sanitization, registration-validation and DB-type helpers. Preserve and reconcile them before implementation; they are not changes made by this audit.

## 2. Current feature audit

“Present” means code exists for the described path; it does not imply production verification.

| Area | Present in source | Missing or incomplete | Evidence |
| --- | --- | --- | --- |
| Event setup | Create/edit, rich text, images/CDN adapter, online/offline/hybrid location, timezone, registration dates, draft/publish/cancel and custom slug | Cross-field backend policy, clone/recurrence, working privacy semantics; create page defaults violate its own date rule | [Event controller](</C:/VS Code/Projects/tiket/tiket-backend/src/controllers/event.controller.ts>), [create page](</C:/VS Code/Projects/tiket/tiket-frontend/app/create/page.tsx:45>) |
| Branding/public page | Event color/font/cover, public metadata, location components | Real host identity, safe public HTML, consistent timezone formatting, robust sharing/SEO; private/public create toggle is not persisted | [Public page](</C:/VS Code/Projects/tiket/tiket-frontend/app/[eventSlug]/page.tsx:134>), [create payload](</C:/VS Code/Projects/tiket/tiket-frontend/app/create/page.tsx:157>) |
| Ticket types | Price, quantity, sale windows, ordering, refund/transfer policy fields and edit UI | Hidden/access-code tickets, per-order limits, bundle/donation/add-on models; sale rules not enforced by checkout | [Ticket controller](</C:/VS Code/Projects/tiket/tiket-backend/src/controllers/ticket-type.controller.ts>), [ticket editor](</C:/VS Code/Projects/tiket/tiket-frontend/app/edit/[eventId]/tickets/components/TicketEditModal/index.tsx>) |
| Registration/forms | Multipage drag/drop builder, varied input types, per-ticket answer table, client validation | Server enforcement in checkout, file storage, conditional/ticket-specific questions, schema/type consistency | [Form controller](</C:/VS Code/Projects/tiket/tiket-backend/src/controllers/form.controller.ts>), [registration](</C:/VS Code/Projects/tiket/tiket-frontend/app/[eventSlug]/form/components/RegistrationForm/index.tsx>), [file input](</C:/VS Code/Projects/tiket/tiket-frontend/app/[eventSlug]/form/components/RegistrationForm/fields/FileField/index.tsx:10>) |
| Checkout/identity | Signed-in purchaser, one ticket selected in UI; backend accepts multiple purchase entries | Account-light checkout, distinct purchaser/attendee identities, group assignment, resumable checkout, reliable return-to-event after sign-in | [Auth gate](</C:/VS Code/Projects/tiket/tiket-frontend/app/[eventSlug]/form/page.tsx:44>), [submission](</C:/VS Code/Projects/tiket/tiket-frontend/app/[eventSlug]/form/services/registrationService.ts:80>), [sign-in](</C:/VS Code/Projects/tiket/tiket-frontend/app/signin/page.tsx:29>) |
| Approval | Event setting, explanatory banner and newly added pending-approval enum | Actual approve/decline workflow, policy enforcement, paid approval strategy, waitlist | [Order creation](</C:/VS Code/Projects/tiket/tiket-backend/src/controllers/order.controller.ts:54>), [schema](</C:/VS Code/Projects/tiket/tiket-backend/src/db/schema.ts:39>) |
| Razorpay | SDK installed, server order creation, checkout script/modal, HMAC helpers, verify/webhook routes | Stored-order binding, captured-state verification, durable event deduplication, failure/refund processing, reconciliation, pricing breakdown and webhook raw-body preservation | [Payment service](</C:/VS Code/Projects/tiket/tiket-backend/src/services/payment.service.ts>), [gateway service](</C:/VS Code/Projects/tiket/tiket-backend/src/services/razorpay.service.ts>), [webhook controller](</C:/VS Code/Projects/tiket/tiket-backend/src/controllers/payment.controller.ts:49>) |
| Capacity/holds | Event capacity and tier quantity fields; ordinary transaction around ticket creation; unused order expiry field | Atomic shared/tier allocation, reservations, expiry/release, authoritative availability and safe late-payment policy | [Order controller](</C:/VS Code/Projects/tiket/tiket-backend/src/controllers/order.controller.ts:98>), [order expiry](</C:/VS Code/Projects/tiket/tiket-backend/src/db/schema.ts:226>) |
| Passes/transfers | QR pass view and PNG download; authenticated pass API; initiate/accept transfer APIs | Refund/transfer attendee UI, invitation/acceptance delivery, atomic transfer guards and QR rotation, wallet/PDF support | [Pass](</C:/VS Code/Projects/tiket/tiket-frontend/app/passes/[ticketId]/page.tsx>), [transfer controller](</C:/VS Code/Projects/tiket/tiket-backend/src/controllers/transfer.controller.ts>) |
| Check-in | Scan API, attendee-table manual check-in/undo, check-in rows, newly added unique ticket constraint in schema | Payment/approval gating, atomic conditional transition, event-bound scanner, camera UI, offline sync, zones, retained undo audit trail | [Scan](</C:/VS Code/Projects/tiket/tiket-backend/src/controllers/check-in.controller.ts:32>), [manual toggle](</C:/VS Code/Projects/tiket/tiket-backend/src/controllers/attendee.controller.ts:445>) |
| Dashboard/analytics | Recent attendees, basic counts, successful-order revenue, tier breakdown, search/filters/pagination, CSV/JSON export, manual issue/cancel | Correct lifecycle-specific counts, revenue/refund ledger, charts/funnel/UTM, payment/refund workspace and live updates | [Attendee stats](</C:/VS Code/Projects/tiket/tiket-backend/src/controllers/attendee.controller.ts:193>), [dashboard hook](</C:/VS Code/Projects/tiket/tiket-frontend/hooks/useAttendees.ts>) |
| Teams | Role/member CRUD, permissions array and UI; event membership checks | Permission-specific enforcement across actions, financial/PII access separation, invite flow, delegated organizer navigation | [Team controller](</C:/VS Code/Projects/tiket/tiket-backend/src/controllers/team.controller.ts>), [permission helper](</C:/VS Code/Projects/tiket/tiket-backend/src/utils/permissions.ts>) |
| Email/automation | Template editor, variables, preview/test/batch/log screens and API; default templates; free-order/scan triggers | Real dispatch/OTP delivery, honest delivery states, durable queue/retries, scheduling, paid-order confirmation trigger, workflow executor | [Email utility](</C:/VS Code/Projects/tiket/tiket-backend/src/utils/emailService.ts:84>), [email controller](</C:/VS Code/Projects/tiket/tiket-backend/src/controllers/email.controller.ts>) |
| Documents | Document-template CRUD; certificate/workflow tables | Template designer/render/issue/download pipeline, certificate verification, delivery and automation execution | [Templates](</C:/VS Code/Projects/tiket/tiket-backend/src/controllers/template.controller.ts>), [schema](</C:/VS Code/Projects/tiket/tiket-backend/src/db/schema.ts:318>) |
| Realtime/integrations | REST API, CDN and Maps adapters; initial Razorpay integration | WebSocket server/client, shared event transport, signed outbound webhooks, calendar/Zoom/CRM automation | [Bootstrap](</C:/VS Code/Projects/tiket/tiket-backend/src/index.ts>), [frontend config](</C:/VS Code/Projects/tiket/tiket-frontend/constants/config.ts>) |
| Operations/quality | Build scripts and Drizzle tooling; Next and an alternative Vinext/Cloudflare setup | Checked-in migration history, maintained tests/CI, production configuration/runbooks, defined deployment target | [Backend package](</C:/VS Code/Projects/tiket/tiket-backend/package.json>), [frontend package](</C:/VS Code/Projects/tiket/tiket-frontend/package.json>), [Wrangler](</C:/VS Code/Projects/tiket/tiket-frontend/wrangler.jsonc>) |

## 3. Release blockers and material risks

| Priority | Finding and effect | Current evidence | Required correction |
| --- | --- | --- | --- |
| P0 | Buyer can mark an order paid without Razorpay | Unconditionally registered mock endpoint and owner-only status update: [route](</C:/VS Code/Projects/tiket/tiket-backend/src/routes/order.routes.ts:7>), [handler](</C:/VS Code/Projects/tiket/tiket-backend/src/controllers/order.controller.ts:308>) | Remove normal-API mock finalization and frontend wrapper; test direct bypass rejection. |
| P0 | Checkout signature is not bound to the selected stored Razorpay order; signature alone activates tickets | [Verification](</C:/VS Code/Projects/tiket/tiket-backend/src/services/payment.service.ts:81>) HMACs client order ID, never compares stored intent, performs separate updates and replaces order ID with payment ID | Preserve distinct gateway order/payment IDs; check ownership, amount, currency and capture; use one guarded transactional reducer. |
| P0 | Pending paid orders already have active QR tickets; gateway initialization can fail after their commit | [Ticket insert](</C:/VS Code/Projects/tiket/tiket-backend/src/controllers/order.controller.ts:186>), [gateway call](</C:/VS Code/Projects/tiket/tiket-backend/src/controllers/order.controller.ts:280>); admission checks ticket state without checking payment | Non-admissible pending allocations, atomic completion, compensation/reconciliation after initialization failures; gate both scan and manual check-in. |
| P0 | Webhooks can fail valid signatures or repeat destructive transitions | [Handler](</C:/VS Code/Projects/tiket/tiket-backend/src/controllers/payment.controller.ts:55>) reserializes parsed JSON; [processor](</C:/VS Code/Projects/tiket/tiket-backend/src/services/payment.service.ts:168>) handles only success events, trusts notes for lookup and activates every order ticket | Verify exact bytes; persist inbox/event ID; map immutable provider IDs; handle ordering/failure/refund; never revive cancelled/refunded/used tickets through a replay. |
| P0 | Overselling and reused inventory after admission | [Availability](</C:/VS Code/Projects/tiket/tiket-backend/src/controllers/order.controller.ts:121>) uses unlocked read/count and counts only `active`; event capacity is not checked; manual issue bypasses limits | One shared atomic allocator for public checkout, manual issue, expiry and payment finalization; `used` remains sold. |
| P0 | Checkout bypasses event/registration/sale/approval/form policy | [Event lookup](</C:/VS Code/Projects/tiket/tiket-backend/src/controllers/order.controller.ts:54>) reads only identity/owner; [answers](</C:/VS Code/Projects/tiket/tiket-backend/src/controllers/order.controller.ts:195>) are inserted without event/required-field validation | Enforce policies in trusted backend before and during allocation; integrate and test the existing validation helper. |
| P0 | Stored HTML can execute on public page | [Rendering](</C:/VS Code/Projects/tiket/tiket-frontend/app/[eventSlug]/page.tsx:198>) inserts API description without sanitizing; backend sanitization helper currently has no consumers | Sanitize trusted-boundary writes and rendering of legacy data; cover other HTML preview paths. |
| P0 | Membership grants actions and private data regardless of role; form-response endpoint has cross-event object access risk | [Access helper](</C:/VS Code/Projects/tiket/tiket-backend/src/controllers/attendee.controller.ts:17>) allows any member; [answers query](</C:/VS Code/Projects/tiket/tiket-backend/src/controllers/attendee.controller.ts:416>) does not bind ticket to the authorized event | Enforce explicit permissions and ticket/event scope on every endpoint, export, pass and later socket subscription. |
| P0 | Admission race/error handling remains incomplete | [Scan transaction](</C:/VS Code/Projects/tiket/tiket-backend/src/controllers/check-in.controller.ts:80>) uses ordinary reads/unconditional writes; manual toggle is multiple independent writes and allows more than active tickets | Conditional state transition plus uniqueness and transaction; unify scan/manual path; retain undo history. |
| P0 | Frontend quality gate fails | Fresh TypeScript check: 3 errors in [RegistrationFormPanel](</C:/VS Code/Projects/tiket/tiket-frontend/app/edit/[eventId]/components/RegistrationFormPanel/index.tsx:62>); lint: 79 errors/42 warnings | Repair shared field/options types, remove unsafe casts, fix errors and establish passing CI/build. |
| P1 | Dashboard totals and financial history can be misleading or lost | All tickets count as attendees, successful manual orders count as revenue; price displays use mutable tier prices; event/order deletion cascades | Separate attendance/payment/refund measures, immutable line-item snapshots, manual-payment categories and retained financial/audit records. |
| P1 | Email “sent” does not mean sent; async triggers can be lost | [sendEmail](</C:/VS Code/Projects/tiket/tiket-backend/src/utils/emailService.ts:84>) logs to console/DB; unawaited triggers run around transactions | Actual provider transport with durable jobs, distinct queued/accepted/delivered/failed states and event-key deduplication. |

The prior evaluation reproduced several of these issues on 19 October. This phase confirms their code paths, not a second run of those mutating scenarios. One finding has changed: **`check_ins.ticket_id` now has `.unique()` in source.** No migration/deployed-constraint verification was performed. Even if applied, it does not replace conditional transitions, payment checks, permission checks or coherent conflict responses.

Other partial fixes matter: pending ticket states, `orders.paymentId` and `orders.expiresAt` exist, but current controllers do not populate/use them for the proposed lifecycle. `verifyEventPermission`, `validateFormResponses`, `toPaise`/`fromPaise`, `sanitizeRichText` and the shared error helper have no integration into the relevant controllers. Installed Nodemailer and sanitize-html are not evidence that mail/sanitization is wired up.

## 4. Fresh verification and limits

| Check | Result on 20 October 2026 |
| --- | --- |
| Backend `tsc --noEmit --incremental false` | Pass |
| Frontend `tsc --noEmit --incremental false` | Fail: 3 errors — field-type state mismatch and array/object options accessed with `.join()`/`.length` |
| Frontend ESLint | Fail: 79 errors, 42 warnings, 40 files with findings; JSON log in `.evaluation/phase2-lint-2026-10-20.json` |
| Maintained tests and migration inventory | No checked-in application test suite or generated migration history found in inspected tree; local evaluation scripts exist |
| Source-only feature search | No implemented WebSocket/Redis/reservation/coupon/waitlist/refund-execution or workflow runner path found |

A fresh production build was not run after the TypeScript failure. The prior evaluation records a failing build; this audit does not claim a fresh build pass/fail beyond the current type-check result. No live Razorpay charge/refund, email send, CDN upload, Maps transaction, database mutation or browser load test was performed. Source presence is not runtime certification. Existing design violations include direct page API calls, type-only import violations, literal module colors and browser confirmation dialogs; repair them as touched features are completed and keep new work compliant.

## 5. Proposed completion sequence

P0 = release blocker; P1 = core parity; P2 = broader parity or differentiation. Phases retain the user's numbering. The foundation step below is the first implementation slice **after approval**, not work executed during Phase 2.

| Milestone | Priority | Concrete tasks | Dependencies | Main risk / exit condition |
| --- | --- | --- | --- | --- |
| Foundation before Phase 3 | P0 | Reconcile in-progress changes; fix frontend types/lint/build; remove mock payment route; sanitize HTML; wire permissions and event-bound object checks; define payment/registration/inventory state contracts; baseline migration and regression harness | Phase 2 approval | Existing DB drift/duplicates and ambiguous legacy payments. Exit: production build/type/lint gates pass, negative authorization/payment tests pass, migration rehearsed on isolated data. |
| Phase 3: Razorpay | P0 | Server-priced immutable order items/fees/tax policy; checkout idempotency; preserve gateway IDs; signed checkout verification; raw-byte webhook inbox and reducer; captured/failed/refund lifecycle; dashboard refund UI; outbox/reconciliation and reliable paid confirmation jobs | Foundation, merchant/tax decisions, test credentials and reachable HTTPS test endpoint; allocation contract agreed with Phase 5 | Cross-order/replay/remote-timeout bugs. Exit: retries and event permutations cause one business effect; unpaid/unapproved pass cannot admit. Test/staging release until Phase 5 passes. |
| Phase 4: realtime organizer dashboard | P0/P1 | Fastify WebSocket plugin, short-lived authenticated connection ticket, per-event authorized subscriptions, typed/versioned messages, heartbeats/reconnect, snapshot recovery, REST fallback, shared fanout for multiple instances | Foundation permissions, Phase 3 durable domain events and snapshot semantics | Lost/reordered events, PII leaks and stale counts. Exit: two browsers/two API instances converge and regain correct state after disconnect or broker restart. |
| Phase 5: seat locks | P0 | 10–15 minute durable reservations, atomic event/tier capacity, lazy expiry plus scheduled cleanup, explicit cancellation/failure release, late-payment resolution, live availability/countdown and broadcasts | Phase 3 lifecycle/refund commands and Phase 4 fanout; migration/backfill | Oversell, deadlock, stuck holds or successful payment after expiry. Exit: last-seat races, expiry/capture races, repeated cleanup and crashes preserve inventory invariants. Paid launch gate. |
| Phase 6: registration and commerce parity | P1 | Fix sign-in return flow; account-light guest registration decision; multi-ticket purchaser/attendee model; approve/decline/waitlist; coupon/access codes with atomic usage limits; bundles/add-ons; per-order limits; uploads; conditional/ticket-specific forms; complete transfer UI and QR rotation | Phases 3–5, line items and durable jobs | Discount abuse and group/session capacity inconsistencies. Exit: full buyer/organizer journeys, policy tests and reconciliation of per-ticket price/refund history. |
| Phase 7: operations parity | P1 | Mobile QR scanner; staff roles and minimal PII; distinct check-in/undo commands; offline cache/outbox and conflict handling; zones/session/meal entitlements as scoped; badge printing; real mail/OTP/reminders and delivery logs; certificate designer/issue/download/verification and workflow runner; sales/attendance charts and exports | Phases 3–6, selected mail/storage/print services | Offline conflicts and duplicate communications/documents. Exit: event-day rehearsal with poor connectivity and accepted document/email output. Core parity review. |
| Phase 8: broader MakeMyPass feature parity | P1/P2 | UTM/referral/affiliate commissions, abandoned-registration recovery, campaign scheduling, organization hubs/embeds, newsletter/CRM/Zoom/calendar integrations, signed outbound webhooks; then networking/gamification/booth visits/voting/stage operations where ecosystem parity is required | Reliable lifecycle, durable jobs, attribution/consent model and agreed scope | Large scope and third-party deliverability/device dependence. Exit: an accepted scenario per in-scope advertised competitor capability; every exclusion explicit. |
| Phase 9: measurable advantage | P2 | Reconciliation/support timeline, transparent India-specific pricing/invoices, privacy-limited scanner, accessible fast checkout, better per-attendee groups, observability and published reliability/latency goals | Core parity and real target-customer pilots | Claims without comparable evidence. Exit: measured pilot improvement against an agreed competitor workflow, not feature count alone. |

Phases 3 and 5 need a shared schema and allocator interface before payment work. At minimum, Phase 3 must introduce non-admissible pending allocation and trustworthy inventory accounting. The full reservation UX and expiry/reclamation engine remain Phase 5. **Do not expose a live paid launch between these phases.** Event mutations should emit durable domain events from Phase 3 so Phase 4 does not have to retrofit every controller later. Seat-count messages added in Phase 5 use that same contract.

A strict Phase 3 → 4 → 5 delivery order can be retained in staging. If earlier public launch becomes a goal, bring the Phase 5 correctness slice forward rather than accepting temporary overselling.

## 6. Phase 3 design and acceptance criteria

### Pricing and data

Use integer paise for calculations and strict decimal conversion of stored prices. Reuse and test the existing money helper. The client supplies ticket/attendee selections and eligible codes, never trusted unit prices, totals, tax amounts or payment status.

Persist immutable order lines with ticket name/policy/price snapshots, quantity, discounts, ticket tax, platform fee, tax on that fee, final charged total and currency. Version the applied pricing/tax policy. Expose the same breakdown before checkout and on receipts/refunds. Do not set a universal GST percentage: seller identity, event/service tax treatment, inclusive/exclusive presentation and fee payer must be confirmed first. Gateway fees/tax charged to the merchant are not automatically the tax owed by an attendee.

Preserve separate Razorpay order ID and payment IDs/attempts with suitable uniqueness. Never overwrite one identifier with another. Record registration/approval and fulfillment states separately from payment state so a captured payment need not imply an admissible registration.

Add a durable webhook inbox, payment-attempt/refund records, operation idempotency records and transactional outbox. Persist an idempotency key and request hash for buyer checkout and organizer refund commands: same key/same payload returns the prior result; same key/different payload conflicts. Scope keys to the actor/operation.

### Payment processing

Checkout verification HMACs the server-stored gateway order ID, binds it to the authenticated purchaser/order and records valid checkout proof. Return “processing” until trusted capture evidence is applied. Client callbacks never directly declare payment success or activate tickets. Razorpay explicitly requires using a trusted stored order ID in signature verification. [Security checklist](https://razorpay.com/security/checklist/)

Preserve the webhook's exact request bytes in a narrowly scoped Fastify parser, verify the dedicated webhook secret, validate the payload and persist it before acknowledging receipt. Deduplicate using `x-razorpay-event-id` plus business-entity guards: `order.paid` and `payment.captured` can describe one payment through different events. Razorpay documents raw-body validation, duplicate delivery and non-guaranteed ordering. [Validation](https://razorpay.com/docs/webhooks/validate-test/), [payment events](https://razorpay.com/docs/webhooks/payments)

Use the webhook-driven reducer as the primary source of state. Map by stored provider IDs and verify account/test-live context, amount/currency and entity linkage; notes are supporting context, not authority. Unknown mappings are durably quarantined for reconciliation. Persist first, then process with retryable worker claims; acknowledge only after durable acceptance, and return retryable errors for failed persistence. Never acknowledge and discard an event because a worker failed.

Handle `payment.captured`, `payment.failed`, optional `order.paid`, and `refund.created`/`refund.processed`/`refund.failed`. A failed *attempt* must not downgrade an already captured order. A stale capture must not revive a voided/refunded ticket. Refund-before-capture event arrival must converge to the same final financial and fulfillment state. Refund lifecycle event names are defined separately by Razorpay. [Refund events](https://razorpay.com/docs/webhooks/refunds)

Keep provider network calls outside inventory/financial DB locks. For order creation or refund responses lost to a timeout, mark the command outcome uncertain and reconcile against provider entities before any retry that could create another remote operation. A local DB transaction alone cannot make an external API call exactly once. Do not assume provider receipt fields are universal idempotency keys.

A server reconciliation job fetches unresolved provider state and applies the same guarded reducer when webhooks are delayed or missing. The UI polls its own authorized order-status endpoint while waiting, and retains the order ID across reloads. Webhook automation stays authoritative; reconciliation repairs omissions with server-obtained evidence. Razorpay recommends API fetching to supplement asynchronous notifications where immediate confirmation is needed. [Integration guidance](https://razorpay.com/docs/server-integration/python/test-app/)

### Organizer refunds

Introduce explicit finance permissions and a dashboard order/payment/refund panel. The server computes the refundable remainder from captured amounts minus processed and reserved/in-flight refunds, validates policy and serializes concurrent refund requests. Record actor, reason, selected tickets/amount, provider refund ID and lifecycle. Display requested/pending/processed/failed accurately. Support full and partial monetary refunds with explicit ticket-void/restock policy; a partial cash refund need not free admission capacity. Refund totals cannot exceed captured value. [Razorpay refund API](https://razorpay.com/docs/api/refunds/create-normal/)

Use durable email/outbound/realtime jobs after commit with unique effect keys. Do not emit email or admission effects inside a transaction that might roll back. Exactly-once business effects come from DB uniqueness and guarded transitions, not from assuming a message is delivered once.

**Required tests:** forged/cross-order signature; wrong amount/currency/account; authorized-but-not-captured payment; duplicate/simultaneous webhook delivery; callback/webhook race; captured and paid events for one payment; stale failure after capture; refund arriving before capture; repeated partial refunds; same payment applied to another order; restart after inbox acceptance and after DB commit; lost gateway response; browser closed before callback; cancelled/used/refunded tickets not resurrected; free/manual orders isolated from gateway transitions.

## 7. Phase 4 design and acceptance criteria

Add `@fastify/websocket` for Fastify lifecycle/auth integration; use native browser WebSocket, not a second frontend socket framework. Register before socket routes, use upgrade hooks for authorization and attach message handlers synchronously; these are plugin-specific constraints. [Plugin documentation](https://github.com/fastify/fastify-websocket)

The existing cookie is on the frontend origin and a browser WebSocket cannot attach an arbitrary Bearer header. Proposed approach: an authenticated BFF action/endpoint mints a very short-lived, single-use connection ticket through the backend. Bind it to user/session, intended event and allowed scopes, consume the nonce in shared storage, enforce Origin, then authorize the event subscription. Avoid long-lived JWTs in URLs/logs. Check permissions again on subscription/reconnect; close or invalidate subscriptions on revocation/expiry. Public availability, if streamed, uses a separate count-only projection with no attendee/payment PII.

Keep a small room registry per process and a shared transport for cross-instance fanout. Start with a durable Postgres outbox; use Redis pub/sub for low-latency fanout if running multiple API instances. Redis pub/sub is at-most-once and must not become the financial log or inventory lock. A subscriber outage can lose messages, so clients recover from an authoritative REST snapshot. [Redis delivery semantics](https://redis.io/docs/latest/develop/pubsub/)

Messages carry an event ID, monotonically increasing event version, type and minimal payload. Include registration, payment, refund, availability and check-in changes. Prefer coalesced invalidations/snapshots for lists/counters to arbitrary client-side arithmetic. Bootstrap and reconnect using a versioned snapshot plus buffered events/replay or a resync loop so changes during snapshot fetch cannot disappear. Ignore duplicates and older versions; refetch on gaps.

Add heartbeat, bounded exponential reconnect with jitter, socket cleanup on navigation/logout, refresh on focus/online and bounded REST polling while disconnected. Display freshness/reconnecting status without disabling ordinary REST operations. Bound payloads, subscriptions and send buffers; disconnect slow consumers. Broker outages degrade live freshness while DB operations remain correct.

**Required tests:** invalid/expired/reused ticket, disallowed Origin, unrelated event subscription, role revoked during connection, no financial fields for scanner role, multi-instance propagation, duplicate/out-of-order/gap messages, reconnect during a sale/check-in, stale REST response after a newer snapshot, broker restart, slow client and normal mutations during socket failure.

## 8. Phase 5 design and acceptance criteria

Assume general-admission inventory first. Assigned seats need seat IDs/maps/unique seat allocations and a separate scoped design. Shared event capacity and tier capacity must both be enforced.

Create durable reservations with actor/order, event/tier quantities, status, `expiresAt` in UTC and operation key. Default proposal: 12 minutes, configurable within the requested 10–15 minute range. Start after valid selections/registration payload when the buyer enters checkout. An incomplete checkout never becomes permanent inventory merely because a ticket row exists.

Correctness invariant per finite inventory bucket:

`confirmed allocations + unexpired held allocations <= capacity`

`available = capacity - confirmed allocations - unexpired held allocations`

Checked-in tickets remain confirmed allocations. Expired/cancelled/failed holds do not consume stock. Payment completion consumes a hold once, not one sold allocation plus the same outstanding hold. Approved free registration also confirms atomically. Pending approval, comps/manual issue, transfer, cancellation and refund follow explicitly defined capacity policies through the same allocator.

Use one lock order everywhere: event row first, then tier rows in sorted ID order, then relevant order/reservation rows. Under that transaction, lazily expire eligible holds, read availability, validate event/tier policy and allocate or convert. PostgreSQL row locks serialize competing writers when every allocating path obeys the protocol; an ordinary read/count transaction does not. [PostgreSQL locking](https://www.postgresql.org/docs/current/explicit-locking.html)

For large events, benchmark event-level serialization before introducing conditional inventory counters or finer-grained allocation. Constraints and periodic invariant reconciliation backstop application checks. Manual registration and admin quantity/capacity edits must use the same rules; reject reductions below already allocated inventory unless there is an explicit audited override.

Availability reads exclude expired holds by database time immediately, even if a cleanup worker has stopped. Read/allocation paths can perform bounded lazy expiration; a restart-safe scheduled worker also claims expired reservations in batches and emits release events once. In-process timers may reduce latency but are not the correctness mechanism. Repeat cleanup is harmless. Clients receive server time and expiry rather than deciding expiry from an untrusted local clock.

Payment failure releases only the matching still-held allocation after checking that no successful attempt has already won. Browser dismiss/abandon sends an authenticated best-effort cancel command; tab closing is not a guaranteed signal, so expiry is the backstop. Any retry after release reacquires capacity under the same checks.

For capture arriving after expiry/release: in a single serialized finalization, first check whether already fulfilled. Otherwise recheck all required inventory and registration eligibility. If capacity is still available, allocate once and complete registration; if it is not, keep the captured-payment fact, do not issue an active pass, and enqueue an idempotent compensating refund. The buyer sees a pending-refund/support state until provider confirmation. Failed refund compensation must alert organizers and remain retryable; it must not silently disappear or oversell.

Write availability changes to the outbox in the same transaction. Broadcast reserve, release, confirm, cancellation and restock changes through Phase 4, with versioned authoritative snapshots. Financial refund processing and seat restocking are distinct policy decisions. Protect scarce inventory with per-actor active-hold limits, bounded cart size and no indefinite renewal.

**Required tests:** many buyers race for the last event seat across different tiers; a multi-ticket order is all-or-nothing; cleanup disabled but lazy reads remain correct; cleanup/capture/cancel race; repeated request idempotency; same idempotency key with different cart; expiry just before capture; late capture after another buyer takes the seat; refund compensation timeout/retry; paid/used allocations never expire; free/manual registration uses the allocator; restarts and two API instances; concurrent capacity edits and coupon/bundle allocations when added.

## 9. Proposed diff boundaries and dependency justification

These are future file groups, not changes already applied.

| Slice | Expected diff scope | Dependency position |
| --- | --- | --- |
| Foundation | Existing controllers/guards, public HTML rendering, shared field types, environment examples, tests/CI and migration baseline | Reuse installed sanitizer/DOMPurify and existing helpers; no new library needed simply to repair these paths |
| Payments | `db/schema.ts` plus generated migrations; order/payment routes/schemas/controllers; Razorpay/payment services; order/payment frontend APIs/types/config; registration hook/service; payment/refund organizer components | Razorpay SDK already installed. Reuse it. Reuse Nodemailer for SMTP if that transport is selected. Preserve lean route bindings |
| Durable lifecycle | Inbox/outbox, processing jobs and reconciliation; bootstrap/safe shutdown and testable app factory | Prefer Postgres plus Bun facilities initially; justify a queue package only if measured requirements exceed this approach |
| Realtime | Backend plugin/auth-ticket/room/transport modules; event snapshot schemas/controllers; frontend BFF endpoint, typed hook/store, config and dashboard components | Justify `@fastify/websocket` by framework lifecycle support. Add a Redis client only if the installed runtime lacks a suitable native client or its behavior fails tests; Redis service itself is infrastructure |
| Seat locks | Reservation schema/migration and allocator; order/manual/check-in/refund transitions; availability/expiry jobs; checkout status/countdown and dashboard consumers | PostgreSQL locking/transactions provide stock correctness; Redis is not required for seat ownership |
| Parity | Coupons/bundles/attendees/workflow/document models, modules and corresponding design-system UI | QR scanner, PDF/wallet and print integrations need separate capability/library justification before installation |

Before each large implementation slice: present the concrete scope, migration/backfill impact, dependency justification and anticipated diff; after it, report actual diff and tests. Preserve unrelated in-progress changes. Never apply a migration to an unidentified existing database just to make local source look current.

## 10. Parity and differentiation acceptance

Core parity is a demonstrable organizer/attendee journey: create and publish → configure tickets/forms/offers → register a group → pay or obtain approval → receive a valid pass → scan with authorized staff → communicate → refund/transfer → export/reconcile and issue certificates. It includes failure and recovery paths, not just successful screenshots.

A MakeMyPass parity review must also resolve offline/zone admission, document/badge output, campaign attribution/recovery and the chosen engagement ecosystem scope described in Phase 1. A deliberate exclusion must be recorded; it cannot be counted as completed parity. Assigned seating is a separate competitive expansion unless a customer requirement makes it mandatory.

Proposed advantages to validate, rather than assert as existing superiority:

- A clear support timeline from reservation through gateway attempts, webhook decisions, admission and refund, with automated mismatch detection.
- Transparent server-quoted INR fee/tax breakdown, invoice/credit-note requirements where applicable and organizer net-revenue reporting.
- Staff who can scan assigned ticket types/zones without automatically seeing all attendee answers or financial data. This addresses a documented Luma limitation: its check-in staff can see full guest/payment/answer details. [Luma staff visibility](https://help.luma.com/p/check-in)
- Complete per-attendee group details and ticket-specific forms. Luma documents limitations here, making it a concrete opportunity if tiket implements the whole flow well. [Luma group limitations](https://help.luma.com/p/group-registration)
- Accessible checkout and measured event-day reliability. Suggested initial targets for agreement: zero oversell or duplicate fulfillment in the concurrency suite, no duplicate financial side effects across replay/crash tests, and 95th-percentile connected dashboard propagation within two seconds at an agreed load. These are proposed acceptance targets, not measured production claims or an absolute guarantee under every failure.

## 11. Phase 2 assumptions and open questions

**Working assumptions:** INR/general admission first; Razorpay Standard Checkout with captured payment required for paid admission; Postgres remains the inventory/financial authority; webhook inbox/outbox and workers are deployable with the API; single-instance development and tested shared fanout before multi-instance production; current source helpers are unfinished work to reuse carefully. No concrete fee/tax rate or merchant settlement model is assumed.

**Decisions required before the dependent implementation:**

1. **Parity boundary:** Core registration/commerce/door operations first, or also networking, games, booth traffic, voting and stage-management tools? Which event segment and expected peak checkout/scanner concurrency?
2. **Money flow:** One platform Razorpay merchant account, organizer-owned accounts, or marketplace/Route-style onboarding and split settlements? Who is seller/merchant of record and who funds refunds? This changes schema, reconciliation and operational scope.
3. **Fees/tax/refunds:** Who absorbs fees; which approved GST/tax rules apply to ticket and platform fee separately; are quoted prices inclusive/exclusive; what invoicing details are needed; can organizers issue partial refunds, refund after check-in or restock cancelled tickets?
4. **Inventory/approval:** General admission or numbered seats; multi-day/session/shared entitlements; proposed 12-minute hold duration; approval-before-payment versus an explicitly supported deferred-capture policy. Do not copy Luma's card-authorization approach across all Razorpay payment methods without validating it.
5. **Deployment:** Next.js or Vinext/Cloudflare frontend; backend hosting and instance count; reverse-proxy WebSocket support; shared Redis availability; worker/cleanup execution and HTTPS test webhook endpoint.
6. **Communications/storage:** SMTP/email provider and sender domain; Maps/CDN/file storage; OTP delivery; badge/PDF/wallet requirements and data/marketing retention choices.
7. **Existing data:** Which database is disposable for tests, which contains real users/orders, whether source constraints were applied, and how legacy pending/paid tickets and existing duplicate admissions should be migrated.

**Requested approval:** Approve or amend this roadmap and the foundation-first approach before Phase 3 begins. The decisions above can be answered together with approval or resolved before their dependent slice. Phase 3, 4 and 5 implementation remains unstarted in this task.
