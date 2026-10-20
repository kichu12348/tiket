# Tiket evaluation

Evaluated locally on 19 October 2026. Application source was evaluated without changing its business logic.

**Assessment: the organizer UI and basic ticket lifecycle work as a prototype, but the project is not ready for production. Payment bypasses, stored XSS, admission races, and a failing frontend production build are release blockers.**

## Running locally

| Service | Address |
| --- | --- |
| Frontend development server | http://localhost:3000 |
| Backend API | http://localhost:3001 |
| Isolated PostgreSQL database | 127.0.0.1:55432 / `tiket_evaluation` |

Installed a workspace-local Bun runtime and the existing locked dependencies. Created ignored development environment files for both apps and a separate PostgreSQL database. No existing database or real user data was used. `.evaluation/` contains the local runtime, database, scripts, logs, and sample accounts; the root `.gitignore` excludes it.

The local database contains evaluation fixtures, including deliberately invalid registrations and a benign HTML execution marker. Sample account details are in the ignored `.evaluation/accounts.json` file.

## Checks

| Check | Result |
| --- | --- |
| Frozen Bun dependency install, both apps | Pass |
| Backend bundle build | Pass |
| Backend TypeScript check | Pass |
| Database schema push into isolated database | Pass |
| Frontend production build | **Fail** during TypeScript checking |
| Frontend standalone TypeScript check | **3 errors** |
| Frontend ESLint | **79 errors, 42 warnings** |
| Browser landing page and password sign-in through BFF cookie | Pass |
| Browser organizer dashboard, overview, public event | Rendered successfully |
| API event creation, publication, ticket tier and required form-field creation | Pass |
| Attendee pass access / unrelated user access | 200 / 403 as expected |
| Anonymous draft-event access | 404 as expected |
| Repeated sequential check-in | Rejected with 400 |

## Release blockers and reproduced defects

### 1. Critical: a buyer can mark an order paid without making a payment

`POST /api/orders/:orderId/pay` is registered unconditionally and calls `payOrderMock`. An authenticated buyer only needs their order ID. A request without a gateway payment ID, signature, or payment confirmation returned **200**, changing a local ₹100 order from `pending` to `success` while `paymentIntentId` remained null.

Sources: `tiket-backend/src/routes/order.routes.ts:8`, `tiket-backend/src/controllers/order.controller.ts:308`.

Remove the mock payment route from the normal API. Only trusted gateway verification and validated webhooks should finalize paid orders.

### 2. Critical: payment verification accepts a signature for a different order

`verifyOrderPayment` checks the HMAC over client-supplied gateway IDs but does not compare the submitted gateway order ID with the selected database order's stored `paymentIntentId`.

A controlled service test created two pending orders with different gateway order IDs. A valid test signature for the ₹100 order changed the **₹10,000 order to success**. The signature was generated with an ephemeral test secret in the test process; no real gateway or money was involved.

Source: `tiket-backend/src/services/payment.service.ts:109`.

Bind verification to the stored gateway order ID and verify the corresponding amount/currency and payment state. Make finalization transactional and idempotent.

### 3. Critical: stored event HTML executes JavaScript on the public page

The API accepted an event description containing an image `onerror` handler. Opening the public event page executed it: the read-only browser check returned `data-tiket-evaluation-xss = "executed"` on the document root.

The demonstration only set a local DOM attribute. It did not read credentials, contact external servers, or change user data. The hydration warning observed on this fixture was caused by that deliberate DOM marker.

Source: `tiket-frontend/app/[eventSlug]/page.tsx:198`. Event descriptions are inserted with `dangerouslySetInnerHTML` without sanitization on this rendering path.

Sanitize HTML using an explicit allowlist at a trusted boundary and before rendering. Client editor sanitization does not protect the API from direct submissions.

### 4. High: unpaid tickets are active and admit attendees

A paid checkout without configured Razorpay credentials returned **500**, but its order and active ticket had already committed. The attendee could retrieve the pass (**200**), and the organizer could check the unpaid ticket in (**201**) while the order was still pending.

Sources: `tiket-backend/src/controllers/order.controller.ts:159`, `tiket-backend/src/controllers/order.controller.ts:186`, `tiket-backend/src/controllers/order.controller.ts:280`, `tiket-backend/src/controllers/check-in.controller.ts:32`.

Keep unpaid allocations non-admissible, check payment state at admission, and handle failed/abandoned payment initialization and inventory reservations explicitly.

### 5. High: simultaneous requests produce duplicate check-ins and overselling

Eight simultaneous scans of one active ticket produced **four successful check-ins and four persisted check-in rows**. The other requests returned 500. The transaction performs ordinary reads followed by an unconditional update; there is no row lock, conditional transition, or unique check-in constraint.

Eight concurrent purchase requests against a one-ticket tier, following its first admission, produced four additional tickets. The tier ended with **five tickets despite a quantity limit of one**.

Sources: `tiket-backend/src/controllers/check-in.controller.ts:80`, `tiket-backend/src/controllers/order.controller.ts:99`, `tiket-backend/src/db/schema.ts:350`.

Use atomic state transitions and database constraints for check-in. Serialize inventory allocation or use a transactional reservation/counter strategy.

### 6. High: check-in makes sold inventory available again

This also reproduces without concurrency: purchase the only ticket in a one-ticket tier, check it in, then purchase again. Both purchases returned **201**, and the database contained two admitted/admissible tickets.

Source: `tiket-backend/src/controllers/order.controller.ts:130`. The availability calculation only counts `active` tickets, excluding tickets changed to `used` by check-in.

Treat admitted tickets as consumed inventory.

### 7. High: checkout ignores event policy and required registration answers

The API returned **201** for all of these local requests:

- Buying a ticket for a draft event.
- Buying a ticket after the event was cancelled and its registration deadline had passed.
- Registering beyond the event's capacity of one.
- Registering without answers to a verified required form field.

The organizer overview displayed **5 / 1 registered guests** after the sequential test.

Source: `tiket-backend/src/controllers/order.controller.ts:59`. Checkout checks that the event exists and that the buyer is not its host/team member, but does not enforce the other registration rules. Ticket sale windows and approval rules are also absent from this path on source inspection; those two cases were not separately exercised.

Enforce event status, registration/sale windows, event capacity, required field validation, field/event relationships, and approval policy on the server.

### 8. High: team role permissions are not enforced for scanning

Created a role with `permissions: []`, assigned a sample volunteer, and scanned a ticket with that volunteer's token. The API returned **201** and marked the ticket used. The frontend exposes a `scan_tickets` permission, but the controller only checks team membership.

Source: `tiket-backend/src/controllers/check-in.controller.ts:49`.

Resolve the member's role and enforce `scan_tickets` before admission.

### 9. High: the frontend cannot produce a production build

`npm run build` compiled the application, then failed at `RegistrationFormPanel/index.tsx:62`. Standalone TypeScript checking identified three errors in that component:

- `FieldType` allows values outside the component's six-value state union.
- `.join()` is called on options that may be an object rather than an array.
- `.length` is read on the same array/object union.

Source: `tiket-frontend/app/edit/[eventId]/components/RegistrationFormPanel/index.tsx:62`.

The options errors also indicate a possible runtime failure when editing object-shaped field options; that UI case was not separately exercised.

### 10. Medium: error responses and quality checks need attention

An unauthenticated scan returned **500**, rather than 401. Concurrent inventory/check-in rejections also returned 500; calls to `tx.rollback()` throw before the intended domain error/response can run.

Lint reports 121 issues: 79 errors and 42 warnings. They include explicit `any`, React hook issues, impure rendering, and empty interfaces. Full logs are saved locally.

## Product and setup limitations

- Password sign-in worked in the browser. OTP delivery and email dispatch remain console/database placeholders; Google sign-in is displayed as a button without an implementation.
- The public event page shows the placeholder host name `The Host`. Global metadata still says `Create Next App`.
- The create-event defaults set the event end to one hour ahead and registration end to 24 hours ahead. In the browser, entering a title and clicking Create Event produced **Registration cannot end after the event has ended.** The form starts with an invalid date combination.
- Maps and image upload were not evaluated end to end: this checkout has no Google Maps key or working CDN service. Live Razorpay checkout/webhook delivery and actual email delivery were not tested.
- `.env.example` does not describe the Razorpay credentials used by the current code, and its backend port of 3000 conflicts with the frontend default. The local evaluation uses backend port 3001.
- No existing automated test files or test scripts were found. The evaluation scripts are local artifacts, not a replacement for maintained regression coverage.

## Recommended order of work

1. Remove mock payment finalization, bind payment verification to the stored order, and prevent unpaid admission.
2. Fix stored HTML sanitization and enforce role permissions.
3. Make inventory and check-in transitions atomic, then enforce all registration policies server-side.
4. Repair the three frontend type errors, restore a passing production build, and address the lint errors.
5. Add maintained regression coverage for the reproduced failures, document environment setup, and complete external integrations.

## Evidence and reproducibility

- `.evaluation/results.json`: sequential API responses and database state.
- `.evaluation/advanced-results.json`: concurrent scans, overselling, and cross-order signature fixture.
- `.evaluation/browser-results.json`: browser observations, including the stored HTML execution marker and invalid creation defaults.
- `.evaluation/frontend-lint.log`: complete ESLint output.
- `.evaluation/frontend-types.log`: all frontend TypeScript errors.
- `.evaluation/organizer-overview.png`, `.evaluation/organizer-capacity.png`, and `.evaluation/public-event.png`: browser screenshots.
- `.evaluation/smoke.mjs` and `tiket-backend/.cache/evaluation-advanced.ts`: local evaluation scripts. They create sample records and intentionally exercise invalid operations; run only against the isolated database.

To restart the local setup, run each command in a separate terminal from the workspace root:

```powershell
node .evaluation/database.mjs
```

```powershell
Set-Location tiket-backend
& '..\.evaluation\runtime\node_modules\bun\bin\bun.exe' run dev
```

```powershell
Set-Location tiket-frontend
& '..\.evaluation\runtime\node_modules\bun\bin\bun.exe' run dev
```
