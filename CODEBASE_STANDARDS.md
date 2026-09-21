# Tiket Codebase Standards

Welcome to the Tiket codebase! This document outlines the architectural patterns, folder structures, and coding conventions used across the project to maintain consistency and scalability.

## 🏗️ Overall Architecture

The project is structured as a monorepo-style split, with clear separation between the frontend and backend applications:

- **`tiket-frontend/`**: The user interface built with Next.js (App Router), using a mix of CSS Modules and Tailwind CSS, and Zustand for state management.
- **`tiket-backend/`**: The REST API server built with Bun, Fastify, and Drizzle ORM, with native JSON schema validation.

---

## 🎨 Frontend Standards (`tiket-frontend`)

### Tech Stack
- **Framework:** Next.js (App Router) with heavy use of Client Components (`"use client"`) for interactive pages.
- **Styling:** CSS Modules (`*.module.css`) are the primary styling mechanism for complex components, combined with Tailwind CSS utility classes and `cn` for conditional styling.
- **State Management:** Zustand (`useEventStore.ts`, `useSidebarStore.ts`).
- **Notifications:** `sonner` is used globally for toast notifications.
- **Sanitization:** `isomorphic-dompurify` is used for safely rendering rich HTML (e.g., event descriptions).
- **Maps:** `@vis.gl/react-google-maps` is used for location picking, relying on the newer `google.maps.places.Place` API.

### Directory Structure & Responsibilities

- **`app/`**: Next.js App Router directory.
  - _Rule:_ Use this for routing, layouts, and assembling page components. Keep page-level CSS in corresponding `.module.css` files.
- **`components/`**: Reusable React components.
  - Base UI components (e.g., `Dropdown`, `Switch`) and complex domain components (e.g., `LocationPicker`, `DateRangeBlock`).
  - _Rule:_ Each complex component should have its own directory containing `index.tsx` and a `.module.css` file.
- **`store/`**: Global state management using Zustand.
  - _Rule:_ Use Zustand for state that spans across decoupled parts of the application or requires optimistic local updates (e.g., `updateEventLocally` in `useEventStore`).
- **`lib/`**: Utility functions and configurations.
  - `api.ts`: Centralized API client/axios instances.
  - `color.ts`: Helpers for color extraction (e.g., `getBackgroundColor`).
  - **`lib/validators/`**: Contains pure validation logic (e.g., `validateEventPayload`) used before form submissions.
- **`api/`**: Direct API call wrappers (e.g., `getSignedUrl`, `updateEvent`) that hit the backend and are consumed by the UI.
- **`constants/`**: Centralized configuration files (e.g., `config.ts`).
  - _Rule:_ Always define your environment variables (like `API_URL` or `CDN_URL`) and API endpoint paths here. Use the `API_ENDPOINTS` object pattern where dynamic routes are functions (e.g., `UPDATE: (id: string) => \`/api/events/${id}\``). Do not hardcode endpoint paths directly in the `api/` layer.

### Component Architecture
1. **Styling Approach:** Use CSS Modules (`styles.container`, `styles.header`) for structural styling of custom components. Use Tailwind for quick utilities and `cn()` from `clsx`/`tailwind-merge` to merge dynamic classes.
2. **Prop Drilling:** Avoid deep prop drilling. Use Zustand if props need to go down more than 2-3 levels.
3. **Data Mutation Pattern:** When mutating data (e.g., saving an event), validate the payload locally (`lib/validators`), call the API layer (`api/events`), and then optimistically update the Zustand store cache (`updateEventLocally`).

### SOLID Principles

#### S — Single Responsibility
Each unit of code has exactly one reason to change.
- **Components** render UI only. They do not fetch data, run business logic, or format API payloads.
- **Custom hooks** (`hooks/`) own one concern each: auth state, token access, form UI logic, etc. A hook that fetches _and_ transforms _and_ validates is doing too much — split it.
- **`lib/validators/`** contains pure validation logic only — no API calls, no side effects.
- **`api/`** wrappers make HTTP calls and return raw data only — no formatting, no store writes.
- **Zustand stores** manage state shape and optimistic updates only — no API calls inside store actions.

#### O — Open/Closed
Extend behavior through composition, not by modifying existing components.
- Prefer `children` and render props over adding conditional branches inside a shared component.
- Use wrapper components or HOC-style hooks to bolt on new behavior (e.g., analytics, permissions) without touching the base component.
- Add new fields to `API_ENDPOINTS` in `constants/config.ts` without altering the callers that already exist.

#### L — Liskov Substitution
A component that accepts a prop type must work correctly with any value that satisfies that type's contract.
- If two components share the same prop interface (e.g., both accept `{ event: Event; onSave: () => void }`), they must be interchangeable in any slot that expects that interface.
- Never narrow a prop type inside a component via `as` casts or `instanceof` checks — fix the interface instead.
- Zustand slices exposed by selectors must remain backward-compatible; callers should not break when the internal shape changes.

#### I — Interface Segregation
Components should not be forced to accept props they don't use.
- Split large prop interfaces rather than passing a whole object when only two fields are needed. Prefer `{ title: string; status: EventStatus }` over `{ event: Event }` when the component only displays those two values.
- Route-level pages own data fetching and pass only the relevant slices down to child components.
- Shared components in `components/` must not import from `store/` or `api/` — receive everything they need as props so they stay reusable and independently testable.

#### D — Dependency Inversion
High-level components depend on abstractions (props, hooks), not concrete implementations (direct API calls or store imports).
- Pages and feature containers talk to `hooks/` or `store/`; they do not call `api/` directly.
- `api/` wrappers use the `api` axios instance from `lib/api.ts`, not raw `fetch` or a custom instance, so transport-level concerns (auth headers, 401 handling) stay in one place.
- If a shared component needs external data, inject it via a prop or a passed-in callback — never import a Zustand store or an `api/` module inside `components/`.

### Design System & Styling
1. **Design Paradigm (Soft UI & Glassmorphism):** The application relies heavily on soft UI aesthetics and glassmorphism. This includes using semi-transparent backgrounds with backdrop blur (e.g., `var(--blur-md)`), subtle glowing background gradients, and minimal, subtle borders instead of solid harsh lines.
2. **Global CSS Variables:** Colors must be strictly driven by variables defined in `app/globals.css`.
   - _Rule (Colors):_ Always use CSS color variables (e.g., `var(--color-soft-bg)`, `var(--color-text-muted)`) from `globals.css`. Do not hardcode hex codes or rgb values in your `.module.css` files. If a required color is missing, add it to `globals.css` under the `:root` scope.
   - _Rule (Other Tokens):_ Using global variables for spacing, typography, blurs, and radii (e.g., `var(--radius-lg)`, `var(--blur-md)`) is highly encouraged for consistency, but remains optional.

---

## ⚙️ Backend Standards (`tiket-backend`)

### Tech Stack
- **Runtime:** Bun
- **Framework:** Fastify
- **ORM:** Drizzle ORM
- **Database:** PostgreSQL

### Directory Structure & Responsibilities

- **`src/routes/`**: API endpoint definitions (e.g., `event.routes.ts`).
  - _Rule:_ Routes should be extremely lean. Bind Fastify routes directly to imported controller methods and attach Fastify JSON schemas for validation. Example: `fastify.post("/", createEventSchema, createEvent);`
- **`src/controllers/`**: Business logic implementation (e.g., `event.controllers.ts`).
  - _Rule:_ Controllers execute the business logic, query the database (via Drizzle), and manage HTTP responses.
- **`src/_schemas/`**: Defines both database schemas and Fastify validation schemas.
  - _Rule:_ Use pure JSON Schema objects (e.g., `const eventResponseObj = { type: "object", ... }`) for Fastify route validation. This ensures high-performance request parsing directly within Fastify's lifecycle.

### API Design Principles
1. **RESTful Conventions:** Use standard HTTP methods (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`) and standard status codes.
2. **Native Fastify Validation:** Validate incoming request payloads (body, query, params) at the route level using JSON schema definitions housed in `src/_schemas/` before they ever reach the controller.
3. **Error Handling:** Use a standardized error response schema `{"error": "string"}` across all failed endpoints (400, 401, 404, 500).

---

## 📝 General Best Practices

### Naming Conventions
- **Files/Folders:**
  - React Components: PascalCase folder names with `index.tsx` (e.g., `LocationPicker/index.tsx`) and `PascalCase.module.css`.
  - Backend files: kebab-case with type suffix (e.g., `event.routes.ts`, `event.schema.ts`).
- **Variables/Functions:** `camelCase` (e.g., `validateEventPayload`, `updateEventLocally`).
- **Constants:** `UPPER_SNAKE_CASE` (e.g., `MAP_ID`, `TRANSPARENT_BG`).

### Type Safety
- **Type-Only Imports (`import type`):** Types, interfaces, and type aliases MUST ALWAYS be imported using explicit type-only imports (e.g. `import type { FastifyRequest } from "fastify";` or `import { type EmailTemplate } from "@/types/email";`). Never mix regular value imports with type imports without type modifiers.
- **Strict Anti-`any` Policy:** NEVER use `any` or loose `as any` casting to bypass TypeScript compilation errors. Using `any` completely destroys the purpose and safety of TypeScript. Always define explicit interfaces, type aliases, or proper generics.
- **Pre-Check Types:** Always inspect and verify exact type definitions, schemas, and return types before manipulating objects or implementing logic.


### 🛡️ Zero Client Trust & Security Principles
- **Never Trust the Client:** The frontend client must **NEVER** be trusted with sensitive computations, business rules, price calculations, permission checks, or payment verifications. The client is completely untrusted and can be arbitrarily modified or spoofed by malicious users.
- **Backend Ownership of Sensitive Logic:**
  - **Financials & Pricing:** Always compute total amounts, discounts, and ticket costs strictly on the backend using database records (e.g., `ticket_types.price`). Never accept user-supplied total amounts or unit prices from client payloads.
  - **Payment Verification:** Always verify payment signatures (e.g., Razorpay HMAC SHA256) cryptographically on the server. Never mark orders as paid based solely on frontend callbacks or client assertions.
  - **Access & Permissions:** Always enforce ownership, role, and permission guards on the backend (e.g., host/team member restrictions, JWT verification). Never rely on frontend UI toggles for security.

