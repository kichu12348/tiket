# TIKET UNIVERSAL DESIGN SYSTEM & COMPONENT SPECIFICATION

This document is the **authoritative UI/UX design specification** for the entire **Tiket** platform (`tiket-frontend`).

**ALL AI agents and human developers MUST strictly follow this design system whenever building, modifying, or refactoring ANY page, modal, card, button, form, or UI component across the entire codebase.**

---

## 1. Core Aesthetic Principles

### 1.1 Dark Glassmorphic Soft-UI Aesthetic

- **Base Background**: Deep dark base background (`#121316` / `var(--color-bg-base)`).
- **Background Glows**: Fixed radial ambient gradients (`var(--glow-bottom-right)` and `var(--glow-bottom-left)`) providing soft depth without clutter.
- **Glass Surfaces**: Translucent container layers (`backdrop-filter: blur(12px)` to `blur(16px)` with subtle white tint `rgba(255, 255, 255, 0.02)` to `rgba(255, 255, 255, 0.05)`).

### 1.2 The "No-Border Card" Rule

- **CRITICAL**: Container cards, overview panels, dashboard blocks, and list item cards **MUST NOT have structural outer borders** (`border: none`).
- Visual boundaries are created strictly through background opacity contrast (e.g. `rgba(255, 255, 255, 0.02)` card background against `#121316` page background), backdrop blurs, and generous internal padding.
- _Exception_: Form input focus rings, inner dividers (`1px solid var(--border-subtle)`), and modal popup containers may use subtle borders.

### 1.3 Chevron Back-Navigation Mandate

- **CRITICAL**: **NEVER** use horizontal arrow icons (`ArrowLeft` / `ArrowRight`) for back navigation or back buttons.
- **ALWAYS** use `<ChevronLeft size={18} />` from `lucide-react` for all back-navigation links and buttons.

### 1.4 Contrast & Typography Hierarchy

- **Primary Text (`#ffffff`)**: Page titles, card headings, active tab labels, primary buttons.
- **Secondary Text (`rgba(255, 255, 255, 0.7)`)**: Subtitles, body copy, list item labels.
- **Muted Text (`rgba(255, 255, 255, 0.4)` / `#9ea0a5`)**: Placeholders, timestamps, helper text, inactive icons.

### 1.5 Radix UI & Shadcn Component Mandate

- **CRITICAL**: **NEVER** use unstyled browser-native interactive controls like standard `<select>`, `<input type="radio">`, `<input type="checkbox">`, or raw browser popovers.
- **ALWAYS** use customized **Shadcn UI** or **Radix UI** primitives from `@/components/ui/` or `radix-ui` (e.g. `Checkbox`, `Select`, `RadioGroup`, `Popover`, `DropdownMenu`).
- Custom primitives MUST be styled to match Tiket's soft UI glass aesthetic (`var(--color-soft-bg)`, `var(--text-primary)`, `var(--radius-sm)`).

### 1.6 Custom Scrollbar Standard

- **CRITICAL**: Scrollable containers, textareas, tab wrappers, lists, and sidebars MUST use the global `.scrollbar` utility class from [`app/globals.css`](file:///c:/Users/kichu/Desktop/tiket/tiket-frontend/app/globals.css).
- Standard Scrollbar styling:
  ```css
  .scrollbar {
    scrollbar-width: thin;
    scrollbar-color: var(--color-soft-bg, rgba(255, 255, 255, 0.08)) transparent;
  }
  ```

---

## 2. Global Tokens & CSS Variables Reference

Always use CSS variables from [`app/globals.css`](file:///c:/Users/kichu/Desktop/tiket/tiket-frontend/app/globals.css) rather than hardcoded hex values:

```css
:root {
  /* Core Background & Surfaces */
  --color-bg-base: #121316;
  --surface-base: #1c1c1e;
  --surface-hover: rgba(255, 255, 255, 0.05);
  --surface-elevated: rgba(255, 255, 255, 0.1);
  --sidebar-bg: rgba(20, 20, 20, 0.4);

  /* Text & Typography */
  --text-primary: #ffffff;
  --text-secondary: rgba(255, 255, 255, 0.7);
  --text-muted: rgba(255, 255, 255, 0.4);

  /* Soft UI Colors */
  --color-soft-bg: rgba(255, 255, 255, 0.05);
  --color-soft-bg-hover: rgba(255, 255, 255, 0.12);
  --color-text-soft: rgba(255, 255, 255, 0.65);

  /* Primary Button Tokens */
  --btn-primary-bg: #ffffff;
  --btn-primary-text: #000000;

  /* Borders & Dividers */
  --border-subtle: rgba(255, 255, 255, 0.08);
  --border-strong: rgba(255, 255, 255, 0.15);

  /* Status Colors */
  --status-success: #28a745;
  --status-success-bg: rgba(40, 167, 69, 0.15);
  --status-warning: #ffc107;
  --status-warning-bg: rgba(255, 193, 7, 0.15);
  --status-danger: rgba(255, 80, 80, 1);
  --status-danger-bg: rgba(255, 80, 80, 0.15);
  --color-info: #1e72e0;

  /* Radii & Blurs */
  --radius-sm: 8px;
  --radius-md: 10px;
  --radius-lg: 16px;
  --blur-sm: 8px;
  --blur-md: 16px;
}
```

---

## 3. Typography Standards

| Element                       | Font Size             | Weight        | Line Height | Color Variable     |
| :---------------------------- | :-------------------- | :------------ | :---------- | :----------------- |
| **Page Title (Hero/Details)** | `2.5rem` - `3.5rem`   | `600` / `700` | `1.1`       | `--text-primary`   |
| **Page Title (Standard)**     | `1.75rem` - `2.25rem` | `700`         | `1.2`       | `--text-primary`   |
| **Section Title (`h2`)**      | `1.15rem` - `1.5rem`  | `600`         | `1.3`       | `--text-primary`   |
| **Card Header (`h3`)**        | `1.05rem` - `1.25rem` | `600`         | `1.3`       | `--text-primary`   |
| **Body / Input Text**         | `0.9rem` - `0.95rem`  | `400` / `500` | `1.5`       | `--text-primary`   |
| **Subtitle / Description**    | `0.85rem` - `0.95rem` | `400`         | `1.4`       | `--text-secondary` |
| **Meta / Helper Text**        | `0.75rem` - `0.85rem` | `400`         | `1.4`       | `--text-muted`     |

---

## 4. Reusable Component Patterns & Code Snippets

### 4.1. Standard Back Button Component

Always use `ChevronLeft` for back navigation:

```tsx
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import styles from "./Component.module.css";

export function BackButton({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className={styles.backBtn}>
      <ChevronLeft size={18} />
      <span>{label}</span>
    </Link>
  );
}
```

```css
.backBtn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: var(--color-soft-bg, rgba(255, 255, 255, 0.05));
  border-radius: var(--radius-sm, 8px);
  padding: 0.35rem 0.65rem;
  color: var(--color-text-soft, rgba(255, 255, 255, 0.65));
  font-size: 0.88rem;
  font-weight: 500;
  cursor: pointer;
  transition:
    background 0.2s ease,
    color 0.2s ease;
  text-decoration: none;
  border: none;
}

.backBtn:hover {
  background: var(--color-soft-bg-hover, rgba(255, 255, 255, 0.12));
  color: var(--text-primary, #ffffff);
}
```

---

### 4.2. Borderless Glass Card (`.card`)

Container card for feature sections, forms, and overview panels:

```css
.card {
  background: rgba(255, 255, 255, 0.02);
  backdrop-filter: blur(16px) saturate(180%);
  -webkit-backdrop-filter: blur(16px) saturate(180%);
  border: none; /* NO BORDER RULE */
  border-radius: 16px;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.cardHeader {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--border-subtle);
  padding-bottom: 1.25rem;
}
```

---

### 4.3. List Item Card (`.listItem` / `.sortableCard`)

Cards inside lists or reorderable containers:

```css
.listItem {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 12px;
  padding: 0.75rem 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border: none; /* NO BORDER RULE */
  backdrop-filter: blur(12px);
  transition:
    background 0.2s ease,
    transform 0.2s ease;
}

.listItem:hover {
  background: rgba(255, 255, 255, 0.05);
}

.listItem[data-dragging="true"] {
  backdrop-filter: blur(10px);
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
  z-index: 100;
}
```

---

### 4.4. Button System

#### Primary Button (Solid White)

Used for main submit, save, or action triggers:

```css
.btnPrimary {
  background: var(--btn-primary-bg, #ffffff);
  color: var(--btn-primary-text, #000000);
  border: none;
  border-radius: var(--radius-md, 10px);
  padding: 0.75rem 1.5rem;
  font-size: 0.95rem;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition:
    opacity 0.2s ease,
    transform 0.1s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
}

.btnPrimary:hover {
  opacity: 0.9;
}

.btnPrimary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

#### Secondary Button (Soft Translucent)

Used for secondary actions, modals, and "Add Item" triggers:

```css
.btnSecondary {
  background: var(--color-soft-bg, rgba(255, 255, 255, 0.05));
  color: var(--color-text-soft, rgba(255, 255, 255, 0.65));
  border: none;
  border-radius: var(--radius-md, 8px);
  padding: 0.4rem 0.8rem;
  font-size: 0.9rem;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition:
    background 0.2s ease,
    color 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.btnSecondary:hover {
  background: var(--color-soft-bg-hover, rgba(255, 255, 255, 0.12));
  color: var(--text-primary, #ffffff);
}
```

#### Icon Action Buttons (36px x 36px)

Used for inline item actions (Edit, Delete, More options):

```css
.iconBtn {
  background: var(--color-soft-bg, rgba(255, 255, 255, 0.05));
  border: none;
  color: var(--color-text-soft, rgba(255, 255, 255, 0.65));
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.iconBtn:hover {
  background: var(--color-soft-bg-hover, rgba(255, 255, 255, 0.12));
  color: var(--text-primary, #ffffff);
}

.iconBtnDanger:hover {
  background: var(--status-danger-bg, rgba(255, 80, 80, 0.15));
  color: var(--status-danger, rgba(255, 80, 80, 1));
}
```

---

### 4.5. Tabs Standards

#### Underline Navigation Tabs (Page level section switching)

```css
.tabs {
  display: flex;
  gap: 2rem;
  border-bottom: 1px solid var(--border-subtle);
  margin-bottom: 1.5rem;
}

.tab {
  padding: 0.85rem 0;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-secondary);
  background: none;
  border: none;
  cursor: pointer;
  position: relative;
  transition: color 0.2s ease;
}

.tab:hover {
  color: var(--text-primary);
}

.tab[data-active="true"] {
  color: var(--text-primary);
}

.tab[data-active="true"]::after {
  content: "";
  position: absolute;
  bottom: -1px;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--text-primary);
  border-radius: 2px 2px 0 0;
}
```

#### Pill Tabs (Form pagination / filter switching)

```css
.pageTab {
  padding: 0.35rem 0.75rem;
  font-size: 0.88rem;
  font-weight: 500;
  border-radius: var(--radius-md);
  cursor: pointer;
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-muted);
  border: 1px solid transparent;
  transition: all 0.2s ease;
}

.pageTab[data-active="true"] {
  background: var(--color-soft-bg-hover, rgba(255, 255, 255, 0.12));
  color: var(--text-primary);
}
```

---

### 4.6. Badges & Indicators

```css
/* Status Pill (Published / Draft) */
.statusBadge {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.3rem 0.6rem;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}

.statusBadge[data-status="published"] {
  background: rgba(46, 204, 113, 0.12);
  color: #2ecc71;
}

.statusBadge[data-status="draft"] {
  background: rgba(241, 196, 15, 0.12);
  color: #f1c40f;
}

/* Price / Role Tag Pill */
.priceBadge {
  font-size: 0.85rem;
  font-weight: 700;
  background: var(--surface-elevated, rgba(255, 255, 255, 0.1));
  padding: 0.25rem 0.6rem;
  border-radius: 6px;
  color: var(--status-success, #28a745);
}
```

---

### 4.7. Form Inputs & Controls

```css
.input,
.select,
.textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 0.6rem 0.8rem;
  border-radius: var(--radius-sm, 8px);
  background-color: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-subtle);
  color: var(--text-primary);
  font-size: 0.95rem;
  font-family: inherit;
  outline: none;
  transition:
    border-color 0.2s ease,
    background-color 0.2s ease;
}

.input:focus,
.select:focus,
.textarea:focus {
  border-color: var(--border-strong);
  background-color: rgba(255, 255, 255, 0.08);
}
```

---

## 5. Page Layout & Spacing Rules

- **Standard Page Widths**:
  - Forms / Settings / Registration: `max-width: 680px` to `800px`, centered (`margin: 0 auto`).
  - Overview / Dashboards / Team: `max-width: 960px` to `1000px`, centered.
- **Page Padding**: `2.5rem` desktop (`padding: 2.5rem 2rem`), `1.5rem` mobile (`padding: 1.5rem 1rem`).
- **Section Spacing**: `gap: 2rem` or `gap: 2.5rem` between top-level cards/sections.

---

## 6. Developer & Agent Checklist

Before outputting code or adding new components to `tiket-frontend`:

- [ ] **Back Navigation**: Using `<ChevronLeft />` from `lucide-react`? (Never `ArrowLeft`).
- [ ] **Cards**: Outer container card has `border: none`?
- [ ] **Background**: Set to `var(--color-bg-base)` (`#121316`) or translucent soft glass?
- [ ] **Primary Action Buttons**: Solid white background (`#ffffff`), black text (`#000000`)?
- [ ] **Secondary Action Buttons**: Soft background (`rgba(255, 255, 255, 0.05)`), soft white text?
- [ ] **Icon Action Buttons**: Sized to `36px x 36px` with soft background?
- [ ] **Typography**: High contrast white for headings, muted white for subtitles?
- [ ] **CSS Modules**: Standardized in `[ComponentName].module.css` using system variables?
- [ ] **Component Primitives**: Using Radix UI / Shadcn primitives (`@/components/ui/`) instead of native `<select>`, `<input type="radio">`, or `<input type="checkbox">`?
- [ ] **Custom Scrollbars**: Applied `.scrollbar` utility class to scrollable elements?
