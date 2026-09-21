# TIKET DESIGN SYSTEM & COMPONENT SPECIFICATION

> 📌 **Note**: This file contains the complete **Universal Tiket Design System**. It applies across all pages (edit pages, public event pages, registration forms, dashboard, signin, modals, cards, etc.).
> See also [`DESIGN_SYSTEM.md`](file:///c:/Users/kichu/Desktop/tiket/tiket-frontend/DESIGN_SYSTEM.md).

---

## 1. Core Aesthetic Principles

### 1.1 Dark Glassmorphic Soft-UI Aesthetic
- **Base Background**: Deep dark base background (`#121316` / `var(--color-bg-base)`).
- **Background Glows**: Fixed radial ambient gradients (`var(--glow-bottom-right)` and `var(--glow-bottom-left)`).
- **Glass Surfaces**: Translucent container layers (`backdrop-filter: blur(12px)` to `blur(16px)` with subtle white tint `rgba(255, 255, 255, 0.02)` to `rgba(255, 255, 255, 0.05)`).

### 1.2 The "No-Border Card" Rule
- **CRITICAL**: Container cards, overview panels, dashboard blocks, and list item cards **MUST NOT have structural outer borders** (`border: none`).
- Visual boundaries are created strictly through background opacity contrast (e.g. `rgba(255, 255, 255, 0.02)` card background against `#121316` page background), backdrop blurs, and generous internal padding.
- *Exception*: Form input focus rings, inner dividers (`1px solid var(--border-subtle)`), and modal popup containers may use subtle borders.

### 1.3 Chevron Back-Navigation Mandate
- **CRITICAL**: **NEVER** use horizontal arrow icons (`ArrowLeft` / `ArrowRight`) for back navigation or back buttons.
- **ALWAYS** use `<ChevronLeft size={18} />` from `lucide-react` for all back-navigation links and buttons.

### 1.4 Contrast & Typography Hierarchy
- **Primary Text (`#ffffff`)**: Page titles, card headings, active tab labels, primary buttons.
- **Secondary Text (`rgba(255, 255, 255, 0.7)`)**: Subtitles, body copy, list item labels.
- **Muted Text (`rgba(255, 255, 255, 0.4)` / `#9ea0a5`)**: Placeholders, timestamps, helper text, inactive icons.

---

## 2. Global Tokens & CSS Variables Reference

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

## 3. Reusable Component Patterns & Code Snippets

### 3.1. Standard Back Button Component
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
  transition: background 0.2s ease, color 0.2s ease;
  text-decoration: none;
  border: none;
}

.backBtn:hover {
  background: var(--color-soft-bg-hover, rgba(255, 255, 255, 0.12));
  color: var(--text-primary, #ffffff);
}
```

---

### 3.2. Borderless Glass Card (`.card`)
Container card for feature sections, forms, overview panels, and modal containers:

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
```

---

### 3.3. Button System

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
  transition: opacity 0.2s ease;
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
  transition: background 0.2s ease, color 0.2s ease;
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

## 4. Developer & Agent Checklist

Whenever building ANY page, feature, card, form, or component in Tiket:

- [ ] **Back Navigation**: Always use `<ChevronLeft />` from `lucide-react` (never `ArrowLeft`).
- [ ] **Card Borders**: Outer container cards have `border: none` (borderless glass cards).
- [ ] **Backgrounds**: Uses `var(--color-bg-base)` (`#121316`) or translucent soft glass (`rgba(255, 255, 255, 0.02 - 0.05)`).
- [ ] **Primary Action Buttons**: Solid white background (`#ffffff`), black text (`#000000`), no borders.
- [ ] **Secondary Action Buttons**: Translucent soft background (`var(--color-soft-bg)`), white hover text.
- [ ] **Icon Action Buttons**: Sized to `36px x 36px` with soft background.
- [ ] **Typography**: High contrast white for headings, muted white for subtitles (`rgba(255, 255, 255, 0.7)`).
- [ ] **CSS Modules**: Standardized in `[ComponentName].module.css` using system design tokens.
