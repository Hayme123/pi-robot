# Figma → Angular Generation Rules

> **Mandatory reading before generating any component code.**
> These rules capture project-specific standards learned from direct collaboration with James Andrew.
> They exist because the main chat produces more accurate results than the standalone figma agent.
> The goal: close that gap.

---

## 1. NTV Components — ABSOLUTE RULES

### 1.1 Strict Usage
- **ALWAYS** use NTV components from `@ntv360/component-pantry` when available
- Do not customize NTV components unless it is genuinely needed to closely match the target image and HTML
- If NTV components can achieve the UI, use them as-is (default rendering + supported inputs/outputs only)
- **NEVER** fall back to generic HTML (`<input>`, `<select>`, `<button>`) or third-party UI libraries when an NTV equivalent exists
- If no NTV component fits, **ask James Andrew** before using a fallback — do not assume

### 1.2 Available NTV Components
```
ntv-accordion, ntv-autocomplete, ntv-breadcrumbs, ntv-button, ntv-calendar,
ntv-card, ntv-carousel, ntv-checkbox, ntv-date-picker, ntv-donut-graph,
ntv-dropdown, ntv-graph, ntv-input, ntv-modal, ntv-popover, ntv-progress,
ntv-searchbar, ntv-skeleton, ntv-stepper, ntv-table, ntv-tabs, ntv-textarea,
ntv-timepicker, ntv-toast, ntv-toggle-button
```

### 1.3 NTV Component Manifests
- Component manifests: `/home/node/.openclaw/workspace-frontend/skills/frontend/component-pantry/<component>/<component>.manifest.ts`

### 1.4 Common NTV Props (from manifests)
- `ntv-input`: `[clearable]`, `size="md|sm|lg"`, `(inputValueChange)="handler($event)"`
- `ntv-dropdown`: `[options]="DropdownOption[]"`, `size="md"`, `variant="default|borderless"`, `(selectionChange)="handler($event)"` — emits `DropdownOption | null`
- `ntv-thumbnail-preview`: `[data]="ThumbnailPreviewData"`, `size="carousel-md|..."`, `variant="default"`, `[rounded]="'lg|xl|full'"`, `[showDuration]="true"`, `[clickable]="true"`, `(thumbnailClick)="handler($event)"`

---

## 2. Design Fidelity

**Do not do this for generated SCSS:**
- long verbose property-per-line CSS when `@apply` can express it cleanly
- mixed style formats in the same file without reason
- flat ungrouped utility spam on one huge line with no logical grouping

**`@apply` formatting standard (emphasize):**
- Prefer one-line `@apply` per selector (default standard)
- Only split to multiple lines when one line is genuinely unreadable
- Keep utilities grouped logically in that one line (layout -> spacing -> typography -> color)

### Responsive
- Always include `@media` breakpoints (1200px, 768px minimum)
- Use full screen width by default; do not add `max-width` constraints on main screen containers unless explicitly requested
- Use `flex-wrap`, `overflow-x: auto` for carousels on mobile

### Colors
- Never hardcode hex colors in generated component HTML, SCSS, or TS styling config
- Map static colors through `tailwind.config.js` tokens first, then use those Tailwind names in SCSS via `@apply`
- Treat `tailwind.config.js` as the source of truth for project color tokens
- use variant="<color from tailwindconfig>" to set the color

### 🚨🚨🚨 `::ng-deep` — FORBIDDEN FOR COLOR OVERRIDING 🚨🚨🚨
**`::ng-deep` MUST NOT be used to change colors of NTV components.**

NTV components consume colors directly from `tailwind.config.js` via their `variant` property.
To change a button's color: use `variant="accent"`, `variant="primary"`, `variant="info"`, etc.
- ✅ CORRECT: `<ntv-button variant="accent">`
- ❌ FORBIDDEN: `::ng-deep button { @apply bg-accent-50 text-accent-main; }`

`::ng-deep` may ONLY be used for structural/style overrides that the component's API does not support
(e.g., `min-width`, `border`, `padding`). All color changes MUST go through `variant`.

### Cards
- For cards always add padding

.summary-card-content {
    padding: 20px 24px;
}

.table-card-body {
    padding: 20px 24px 24px;
}

---

## 3. Angular Architecture

### 3.1 Standalone Components
- All components MUST use `standalone: true`
- Import dependencies explicitly
- Add `SafeHtmlPipe` to `imports: []` only when the template actually uses `[innerHTML]`

### 3.2 SafeHtmlPipe (ERR-007)
- Use `SafeHtmlPipe` only when icons/content are rendered via `[innerHTML]`
- Do not create `shared/pipes/safe-html.pipe.ts` in projects that use sprite `<svg><use></use></svg>` or normal template markup only
- Usage when needed: `[innerHTML]="icons.SOME_ICON | safeHtml"`

### 3.3 Typed Icon Constants (ERR-010)
- When using bracket notation in templates (`icons['SOME_ICON']`), type the constant as `any`:
  ```typescript
  export const MAIN_ICONS: any = { ... };
  ```

### 3.4 Signals over plain properties
- Prefer Angular `signal<T>()` for reactive state (searchValue, selectedGenre, etc.)
- Use `.set()` to update, `.subscribe()` / `computed()` as needed

### 3.5 SSR-safe Pantry components
- Do not render a Pantry component on the server when its implementation accesses browser globals such as `document`, `window`, or DOM observers.
- For `ntv-graph`, render it only after hydration: initialize a `signal(false)`, set it to `true` in `afterNextRender()`, and guard the graph markup with `@if`. Keep the server render free of the graph component.
- If a screen has several Pantry components that are not SSR-safe, guard the screen's Pantry-dependent content once in its page component using the same `signal(false)` and `afterNextRender()` pattern, rather than adding a guard to every child.

---

## 4. Code Quality

### 4.1 JSDoc — MANDATORY on every class member

All properties and methods (public/protected/private) MUST have full JSDoc block comments:

```typescript
// ✅ CORRECT
/**
 * Toggles the expansion state of a ToC category.
 * If opening a category, closes all others.
 * @param {TocCategory} category The category to toggle.
 * @public
 */
public toggleCategory(category: TocCategory): void { ... }

/**
 * Adds two numbers together.
 * @param {number} a - The first number.
 * @param {number} b - The second number.
 * @returns {number} The sum of the two numbers.
 */
private add(a: number, b: number): number { ... }

// ❌ WRONG — single-line or missing JSDoc
public toggleCategory(category: TocCategory): void { ... }  // no JSDoc
// handle search  <-- single line, no block
public onSearch(event: string): void { ... }
```

Requirements:
- Use block `/** ... */` syntax, not single-line `//`
- Include `@param` and `@returns` for methods
- Include `@public` for public APIs
- Never leave any class member undocumented

### 4.2 Component Structure
Follow this order in component classes:
1. `readonly` icon/template constants
2. Imports (organized by group — see below)
3. Inputs (options arrays, static data)
4. State (signals, form controls)
5. Event handlers
6. Helpers (data mappers, toThumbnailData, etc.)

### 4.2 Import Organization
Group imports clearly and use path aliases where available.

```typescript
import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { NtvButtonComponent } from '@ntv360/component-pantry';

import { AuthService } from '@core';
import { DashboardComponent } from '@features/dashboard';
import { MyComponent } from '@shared/components';
```

Rules:
- Keep imports ordered logically: Angular → third party / NTV → local
- Section banners are optional; consistency matters more than comment headers
- Use path aliases (`@core`, `@features`, `@shared`, `@layouts`) for local imports when the app provides them
- For server files: use `.js` extension where required by the runtime

### 4.3 Constants File
- Separate constants into `*.constants.ts` file (e.g. `main-page.constants.ts`)
- Keep icon SVGs in `core/constants/icon.constant.ts`
- Export typed interfaces alongside constants

### 4.4 Clean Code
- No empty interfaces
- No `any` unless required by a verified library typing edge case
- Follow the scaffold structure in `SCAFFOLDING-REFERENCE.md` (`pages/<project-name>/` root with `constants/`, `interfaces/`, optional `components/`)
- Keep `components/` at the same level as `constants/` and `interfaces/` within `pages/<project-name>/`
- Consistent naming: kebab-case for files, PascalCase for classes
- Keep TypeScript class names short and sample-file style; do not add frame/job/generated suffixes or bloated names when a simple component name fits
- Keep HTML/SCSS BEM block names short too; use simple feature blocks like `.dashboard`, `.hosts`, `.details`, not long generated names
- Use one primary BEM block per component, and keep it aligned to the same short feature name as the component/file whenever possible
- Do not enforce a hard line-count limit on component files
- Split pages into child components/tabs by UI section and interaction boundaries
- Extract static config to `constants/` and typing to `interfaces/`
- UI-only generation: do not add business logic/data-fetch/API functionality for page features
- Keep only minimal UI interaction handlers needed for static interface behavior

---

*Last updated: 2026-03-13. Based on lessons from direct collaboration with James Andrew.*
