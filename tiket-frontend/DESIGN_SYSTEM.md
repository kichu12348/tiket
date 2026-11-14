# TIKET DESIGN SYSTEM (Flash Sub-Agent Guide)

Authoritative specification based on `tickets` and `forms` edit pages. All custom UI uses CSS Modules (`*.module.css`). Tailwind is ONLY permitted inside `@/components/ui/*` (shadcn). All colors/values MUST come from `app/globals.css`.

### 1. Component Modularity & Architecture
| Rule | Directory / File Pattern | Description |
| :--- | :--- | :--- |
| **Component Directory** | `PascalCase/index.tsx` + `PascalCase.module.css` | Every component is modular and self-contained. |
| **Sub-Components** | `PascalCase/components/SubComponent/` | Extract child UI into its own folder with its own `index.tsx` + `.module.css`. |
| **Helper Functions** | `PascalCase/functions/` | Extract business/formatting functions out of component files into `functions/`. |
| **Styling Method** | **CSS Modules (`*.module.css`)** | Custom UI uses CSS Modules. Tailwind ONLY inside `@/components/ui/*`. |
| **Tokens & Colors** | **CSS Variables (`var(--...)`)** | Strictly from `app/globals.css`. NO raw hex/rgb in `.module.css`. |

### 2. Page Shell & Layout Tokens (from `tickets` & `forms`)
| Layout Element | CSS Module Properties | Variable / Token |
| :--- | :--- | :--- |
| **Page Container** | `max-width: 900px; margin: 0 auto; padding: 2rem 1.5rem; display: flex; flex-direction: column; gap: 1.5rem;` | Width 800-900px for edit pages, 1200px for tables |
| **Header Block** | `display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 0.5rem;` | Page header wrapper |
| **Card / Panel** | `background: var(--surface); backdrop-filter: blur(var(--blur-md)); border-radius: var(--radius-sm); border: none; padding: 1rem 1.25rem;` | Dark soft UI (`StandardFieldCard` & `ticketCard` style) |
| **Action Buttons** | `background: var(--color-soft-bg); color: var(--color-text-soft); border-radius: var(--radius-sm); border: none; padding: 0.35rem 0.65rem; font-size: 0.9rem; font-weight: 500;` | `addQuestionBtn` & `createBtn` soft buttons |
| **Modals (Exception)** | `background: var(--color-soft-bg); backdrop-filter: blur(var(--blur-lg)); border: 1px solid var(--color-border-light); border-radius: var(--radius-lg);` | `TicketEditModal` & `FieldModal` shell |

### 3. Surface & Border Rules (Strict)
| Element | Border Rule | Background & Surface Tokens |
| :--- | :--- | :--- |
| **Cards & Containers** | **NO BORDER (`border: none;`)** | `background: var(--surface); backdrop-filter: blur(var(--blur-md));` |
| **Primary Button** | **NO BORDER (`border: none;`)** | `background: var(--btn-primary-bg); color: var(--btn-primary-text); font-weight: var(--font-weight-medium);` |
| **Secondary Button** | **NO BORDER (`border: none;`)** | `background: var(--color-soft-bg); color: var(--color-text-soft);` (Hover: `rgba(255, 255, 255, 0.1)`) |
| **Modals** | `border: 1px solid var(--color-border-light);` | `background: var(--color-soft-bg); backdrop-filter: blur(var(--blur-lg));` |
| **Inputs & Dividers** | `border: 1px solid rgba(255, 255, 255, 0.1);` | `background: rgba(255, 255, 255, 0.05); border-radius: var(--radius-sm);` |

### 4. Color & Status Tokens (`app/globals.css`)
| Token | Variable | Value / Description | Usage |
| :--- | :--- | :--- | :--- |
| **Base Background** | `var(--color-bg-base)` | `#121316` | Body & page root background |
| **Text Primary** | `var(--text-primary)` | `#ffffff` | Headings, active values, high contrast |
| **Text Secondary** | `var(--text-secondary)` | `rgba(255, 255, 255, 0.7)` | Labels, subheaders, descriptions |
| **Text Muted** | `var(--text-muted)` | `rgba(255, 255, 255, 0.4)` | Subtitles, helper text, hints |
| **Success Status** | `var(--status-success)` / `var(--status-success-bg)` | `#28a745` / `rgba(40, 167, 69, 0.15)` | Checked in, paid, approved, personal info icon |
| **Warning Status** | `var(--status-warning)` / `var(--status-warning-bg)` | `#ffc107` / `rgba(255, 193, 7, 0.15)` | Pending approval, custom questions icon |
| **Danger Status** | `var(--status-danger)` / `var(--status-danger-bg)` | `rgba(255, 80, 80, 1)` / `rgba(255, 80, 80, 0.15)` | Declined, rejected, delete button hover |

### 5. Typography Scale
| Role | CSS Properties | Usage |
| :--- | :--- | :--- |
| **Page Title** | `font-size: 1.5rem; font-weight: 600; color: var(--text-primary);` | Top view title (`.title`) |
| **Page Subtitle** | `font-size: 0.95rem; font-weight: 400; color: var(--text-muted);` | Header description (`.subtitle`) |
| **Section Header** | `font-size: 1.05rem; font-weight: 600; color: var(--text-primary);` | Section headers (`.sectionHeader`) |
| **Body & Labels** | `font-size: 0.875rem - 0.925rem; color: var(--text-secondary);` | Inputs, table cells, descriptions |
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
