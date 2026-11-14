# TIKET DESIGN SYSTEM (Flash Sub-Agent Guide)

Authoritative specification. Use CSS Modules (`*.module.css`) for all custom components; Tailwind is ONLY permitted inside `@/components/ui/*` (shadcn). All colors/values MUST come from `app/globals.css`.

### 1. Component Modularity & Architecture
| Rule | Directory / File Pattern | Description |
| :--- | :--- | :--- |
| **Component Directory** | `PascalCase/index.tsx` + `PascalCase.module.css` | Every component is modular and self-contained. |
| **Sub-Components** | `PascalCase/components/SubComponent/` | Extract child UI into its own folder with its own `index.tsx` + `.module.css`. |
| **Helper Functions** | `PascalCase/functions/` | Extract business/formatting functions out of component files into `functions/`. |
| **Styling Method** | **CSS Modules (`*.module.css`)** | Custom UI uses CSS Modules. Tailwind ONLY inside `@/components/ui/*`. |
| **Tokens & Colors** | **CSS Variables (`var(--...)`)** | Strictly from `app/globals.css`. NO raw hex/rgb in `.module.css`. |

### 2. Page Shell & Layout Tokens (`app/globals.css`)
| Layout Element | CSS Module Properties | Variable / Token |
| :--- | :--- | :--- |
| **Page Container** | `max-width: var(--layout-max-width); margin: 0 auto; padding: var(--layout-padding-y) var(--layout-padding-x); display: flex; flex-direction: column; gap: 1.5rem;` | `1200px`, padding 2rem 4rem |
| **Card / Panel** | `background: var(--surface); backdrop-filter: blur(var(--blur-md)); border-radius: var(--radius-lg); border: none; padding: 1.5rem;` | Dark translucent soft UI |
| **Modals (Exception)** | `background: var(--color-soft-bg); backdrop-filter: blur(var(--blur-lg)); border: 1px solid var(--color-border-light); border-radius: var(--radius-lg);` | `TicketEditModal` pattern |
| **Stat / KPI Grid** | `display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem;` | Grid for metric cards |

### 3. Surface & Border Rules (Strict)
| Element | Border Rule | Background & Surface Tokens |
| :--- | :--- | :--- |
| **Cards & Containers** | **NO BORDER (`border: none;`)** | `background: var(--surface); backdrop-filter: blur(var(--blur-md));` |
| **Primary Button** | **NO BORDER (`border: none;`)** | `background: var(--btn-primary-bg); color: var(--btn-primary-text); font-weight: var(--font-weight-medium);` |
| **Secondary Button** | **NO BORDER (`border: none;`)** | `background: var(--color-soft-bg); color: var(--text-primary);` (Hover: `background: var(--color-soft-bg-hover);`) |
| **Modals** | `border: 1px solid var(--color-border-light);` | `background: var(--color-soft-bg); backdrop-filter: blur(var(--blur-lg));` |
| **Inputs & Dividers** | `border: 1px solid var(--border-subtle);` | `background: var(--color-soft-bg-subtle); border-radius: var(--radius-md);` |

### 4. Color & Status Tokens (`app/globals.css`)
| Token | Variable | Value / Description | Usage |
| :--- | :--- | :--- | :--- |
| **Base Background** | `var(--color-bg-base)` | `#121316` | Body & page root background |
| **Text Primary** | `var(--text-primary)` | `#ffffff` | Headings, active values, high contrast |
| **Text Secondary** | `var(--text-secondary)` | `rgba(255, 255, 255, 0.7)` | Labels, subheaders, descriptions |
| **Text Muted** | `var(--text-muted)` | `rgba(255, 255, 255, 0.4)` | Timestamps, metadata, hints |
| **Success Status** | `var(--status-success)` / `var(--status-success-bg)` | `#28a745` / `rgba(40, 167, 69, 0.15)` | Checked in, paid, approved |
| **Warning Status** | `var(--status-warning)` / `var(--status-warning-bg)` | `#ffc107` / `rgba(255, 193, 7, 0.15)` | Pending approval, unsettled |
| **Danger Status** | `var(--status-danger)` / `var(--status-danger-bg)` | `rgba(255, 80, 80, 1)` / `rgba(255, 80, 80, 0.15)` | Declined, rejected, refunded |

### 5. Typography Scale
| Role | CSS Properties | Usage |
| :--- | :--- | :--- |
| **Page Title** | `font-size: 1.5rem; font-weight: var(--font-weight-bold); color: var(--text-primary);` | Main view header |
| **Section Title** | `font-size: 1.15rem; font-weight: var(--font-weight-semibold); color: var(--text-primary);` | Card / panel titles |
| **Body & Subtext** | `font-size: 0.875rem; font-weight: var(--font-weight-regular); color: var(--text-secondary);` | Table text, labels, hints |
| **Monospace** | `font-family: var(--font-mono); font-size: 0.75rem; text-transform: uppercase;` | Ticket codes (`EXO-482910`), UUIDs |

### 6. Allowed UI Primitives & Icons
| Category | Allowed Items | Rule |
| :--- | :--- | :--- |
| **Shadcn UI** | `Card`, `Badge`, `Button`, `Input`, `Tabs`, `Progress`, `Table`, `Select`, `Switch`, `Alert`, `Skeleton`, `Sheet`, `Popover`, `DropdownMenu` | Import strictly from `@/components/ui/*` |
| **Icons** | `Coins`, `ShieldCheck`, `Check`, `X`, `ChevronLeft`, `ChevronDown`, `Clock`, `Calendar`, `Search`, `Filter`, `Download`, `User`, `QrCode`, `AlertCircle` | Import strictly from `lucide-react` |
| **Back Nav** | `<ChevronLeft size={18} />` from `lucide-react` | NEVER use `ArrowLeft` |

### 7. Hard "NEVER DO THIS" Rules for Sub-Agents
- **NEVER create monolithic component files** — split sub-components into `components/` and helper logic into `functions/`.
- **NEVER use Tailwind for custom components or pages** — use CSS Modules (`*.module.css`). Tailwind is ONLY for shadcn UI primitives.
- **NEVER use hex or rgb literals in `.module.css`** — use CSS variables from `app/globals.css` (`var(--...)`).
- **NEVER put borders on cards or buttons** (`border: none;` only). Subtle borders allowed ONLY on modals, inputs, and dividers.
- **NEVER use custom gradients, neon glows, glass borders, or `rounded-3xl` cards**.
- **NEVER use `ArrowLeft` for back navigation** (always `<ChevronLeft size={18} />`).
- **NEVER use `any` or `as any`** — define explicit TypeScript interfaces or aliases.
