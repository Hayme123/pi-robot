---
name: angular-developer
description: Angular UI generation only. Use when HTML, CSS, JavaScript, and a reference image are prepared and the task is to generate page-structured Angular files.
---

# Angular Developer Guidelines

## Inputs
Use only:
- the supplied HTML path (`layout.html` or `index.html`) as the **primary source of truth** for structure and content
- `styles.css` beside the HTML as the **primary source of truth** for spacing, layout, colors, typography, and responsive behavior
- `frame.png` (or the provided reference image) as a **secondary opinion** for visual cross-check
- the backend-generated SVG sprite and its supplied symbol IDs for relevant icons
- the supplied existing Angular project as the output target

## Forbidden inputs
- Do not read/use `frame_data.json`.
- Do not read/use `frame_data_clean.json`.
- Do not read/use metadata JSON.
- Do not read files from other jobs/unrelated directories.

---

## Reference Reads

Before coding, read the complete supplied HTML and `styles.css`, view the reference image, then read these mandatory references in full before selecting components:

- [SCAFFOLDING-REFERENCE.md](./references/SCAFFOLDING-REFERENCE.md)
- [CODE-STANDARD-GUIDELINES.md](./references/CODE-STANDARD-GUIDELINES.md)
- [KNOWN-ERRORS.md](./references/KNOWN-ERRORS.md)
- [GENERATION-RULES.md](./references/GENERATION-RULES.md)
- [component-folders.md](./references/component-folders.md)

Then select matching components from the list below and read only those selected component references.

Read these additional references only when needed:

- [jsdoc.md](./references/jsdoc.md) only when adding or changing JSDoc.
- [testing-fundamentals.md](./references/testing-fundamentals.md) only when adding or changing tests.

---

## Component Pantry contract
- Component Pantry is mandatory. Map every visual control, data display, overlay, navigation control, and chart in the supplied HTML and image to the exhaustive component list below before coding.

### Available components

| Component | Tag | Reference |
|---|---|---|
| Accordion | `ntv-accordion` | [accordion.md](./references/component-pantry/references/accordion.md) |
| Autocomplete | `ntv-autocomplete` | [autocomplete.md](./references/component-pantry/references/autocomplete.md) |
| Breadcrumbs | `ntv-breadcrumbs` | [breadcrumbs.md](./references/component-pantry/references/breadcrumbs.md) |
| Button | `ntv-button` | [button.md](./references/component-pantry/references/button.md) |
| Calendar | `ntv-calendar-base` | [calendar.md](./references/component-pantry/references/calendar.md) |
| Card | `ntv-card` | [card.md](./references/component-pantry/references/card.md) |
| Carousel | `ntv-carousel` | [carousel.md](./references/component-pantry/references/carousel.md) |
| Checkbox | `ntv-checkbox` | [checkbox.md](./references/component-pantry/references/checkbox.md) |
| Content View | `ntv-content-view` | [content-view.md](./references/component-pantry/references/content-view.md) |
| Date Picker | `ntv-date-picker` | [date-picker.md](./references/component-pantry/references/date-picker.md) |
| Date Range Picker | `ntv-date-range-picker` | [date-range-picker.md](./references/component-pantry/references/date-range-picker.md) |
| Donut Graph | `ntv-donut-graph` | [donut-graph.md](./references/component-pantry/references/donut-graph.md) |
| Dropdown | `ntv-dropdown` | [dropdown.md](./references/component-pantry/references/dropdown.md) |
| Error States | `ntv-error-states` | [error-states.md](./references/component-pantry/references/error-states.md) |
| Graph | `ntv-graph` | [graph.md](./references/component-pantry/references/graph.md) |
| Grid | `ntv-grid` | [grid.md](./references/component-pantry/references/grid.md) |
| Horizontal Graph | `app-horizontal-graph` | [horizontal-graph.md](./references/component-pantry/references/horizontal-graph.md) |
| Input | `ntv-input` | [input.md](./references/component-pantry/references/input.md) |
| Modal | `ntv-modal` | [modal.md](./references/component-pantry/references/modal.md) |
| Offcanvas | `ntv-offcanvas` | [offcanvas.md](./references/component-pantry/references/offcanvas.md) |
| Popover | `ntv-popover` | [popover.md](./references/component-pantry/references/popover.md) |
| Progress | `ntv-progress` | [progress.md](./references/component-pantry/references/progress.md) |
| Radial Graph | `ntv-radial-graph` | [radial-graph.md](./references/component-pantry/references/radial-graph.md) |
| Searchbar | `ntv-searchbar` | [searchbar.md](./references/component-pantry/references/searchbar.md) |
| Skeleton | `ntv-skeleton` | [skeleton.md](./references/component-pantry/references/skeleton.md) |
| Stack | `ntv-stack` | [stack.md](./references/component-pantry/references/stack.md) |
| Stepper | `ntv-stepper` | [stepper.md](./references/component-pantry/references/stepper.md) |
| Table | `ntv-table` | [table.md](./references/component-pantry/references/table.md) |
| Tabs | `ntv-tabs` | [tabs.md](./references/component-pantry/references/tabs.md) |
| Template | `ntv-template` | [template.md](./references/component-pantry/references/template.md) |
| Textarea | `ntv-textarea` | [textarea.md](./references/component-pantry/references/textarea.md) |
| Thumbnail Gallery | `ntv-thumbnail-gallery` | [thumbnail-gallery.md](./references/component-pantry/references/thumbnail-gallery.md) |
| Thumbnail Item | `ntv-thumbnail-item` | [thumbnail-item.md](./references/component-pantry/references/thumbnail-item.md) |
| Thumbnail Preview | `ntv-thumbnail-preview` | [thumbnail-preview.md](./references/component-pantry/references/thumbnail-preview.md) |
| Thumbnail Tag | `ntv-tag` | [thumbnail-tag.md](./references/component-pantry/references/thumbnail-tag.md) |
| Timepicker | `ntv-timepicker` | [timepicker.md](./references/component-pantry/references/timepicker.md) |
| Toast | `ntv-toast` | [toast.md](./references/component-pantry/references/toast.md) |
| Toggle Button | `ntv-toggle-button` | [toggle-button.md](./references/component-pantry/references/toggle-button.md) |
| Uploader | `ntv-uploader` | [uploader.md](./references/component-pantry/references/uploader.md) |
| Video Preview | `ntv-video-preview` | [video-preview.md](./references/component-pantry/references/video-preview.md) |
- When a Pantry component covers an element, use that documented `ntv-*` component; never implement or style a custom equivalent merely because it is easier.
- Do not use native `input`, `select`, `textarea`, checkbox, date/time picker, tabs, table, card, modal/drawer, toast, progress bar, carousel, accordion, autocomplete, search, uploader, gallery, graph/chart, or toggle when Pantry has a match.
- Do not add another UI library.
- Native HTML is allowed for semantic text, images, links, SVGs, structural layout, and buttons with no suitable Pantry equivalent.
- Use `ntv-button` when it can reproduce the required button; otherwise use a styled native `button`. Do not force every button into `ntv-button`.
- Read the reference for every selected Pantry component before using it.
- During the final audit, replace every custom/native template element or import that overlaps the component list below.

---

## Feature selection and decomposition
- Inspect the HTML first and choose an appropriate lowercase kebab-case feature name.
- If the feature is not `dashboard`, rename `src/app/features/dashboard` to `src/app/features/<feature-name>`, update imports and routes, then delete the old dashboard directory and all obsolete dashboard-named scaffold or migration placeholders.
- Leave no dashboard imports, routes, files, duplicate page implementations, or generated files outside the selected feature directory.
- Split the screen only into major visual sections under `src/app/features/<feature-name>/components/<component-name>/`.
- Treat application chrome such as navigation bars, sidebars, top bars, and similar cross-page layout components as shared. Place each under `src/app/shared/components/<component-name>/`, not directly under `shared/` or inside a feature directory.
- Keep related controls and local interactions in their owning section component; do not create child components for individual controls or small interactive units.
- Give each major child component colocated `.component.ts`, `.html`, `.scss`, and `.spec.ts` files. Keep the feature component as the composition shell.
- Do not create empty wrappers around individual Pantry controls.

---

## Hard rules
- Rely on generated `layout.html` first for implementation decisions.
- Spacing is strict: follow `layout.html` spacing values/patterns for margin, padding, gap, and section rhythm. Do not invent or normalize spacing.
- Use image only as a second opinion to verify positioning/visual alignment.
- If `layout.html` and image differ, follow the image.
- **STRICTLY** use NTV components first when a pantry component fits.
- Respect scaffold structure from `SCAFFOLDING-REFERENCE.md` and the required component decomposition in `component-folders.md`.
- **All styling in SCSS only** (no utility classes in HTML).
- Use short, feature-aligned BEM naming.
- SCSS must be written in nested BEM style (block { &__el {} &--mod {} }), not flat BEM selector lists.
- For Tailwind utilities in SCSS, keep `@apply` on one line per selector whenever possible (single-line `@apply` standard).
- Never use `::ng-deep`. Use Component Pantry APIs and supported variants; do not override or alter Pantry internals.
- `data-testid` is required on all user-interactive elements/components.
- Include interactive controls like buttons, dropdowns, breadcrumbs links, tables, and interactive table controls/columns.
- `data-testid` names: lowercase hyphenated, max 5 words.
- Use clean typed constants/interfaces.
- The backend prebuilds `src/assets/icons/icons-sprite.svg` with every source SVG plus `ncompasstv-logo`, `ntv360-logo`, and `ncompass-cursor`. Judge the reference and use `ncompasstv-logo` for N-Compass TV or `ntv360-logo` for NTV360; use `ncompass-cursor` only when the reference shows the N-Compass cursor mark.
- Use the prebuilt sprite IDs supplied in the task prompt whenever one matches the required icon. Do not read source SVG files, regenerate, or audit existing symbols.
- Never use text characters, Unicode symbols, or emoji as visual icons. If no supplied symbol matches a required icon, create one faithful SVG `<symbol>` with a unique kebab-case ID in `icons-sprite.svg`, then reference it normally.
- Reference symbols with `<use>`; do not inline SVG path data in component files.
- Never format SVG files with Prettier.
- In templates, reference icons with `assets/icons/icons-sprite.svg#<icon-id>` (e.g. `<use [attr.xlink:href]="'assets/icons/icons-sprite.svg#' + btn.icon"></use>`).
- When a button includes both an icon and text, include a space between the icon and the text label.
- UI-only output: no business/data/API functionality.
- Keep only minimal UI interaction handlers for static UI behavior.
- For SSR-incompatible browser-only Pantry components, including each graph and table, gate every affected template section with `@if (hydrated())`. Do not protect only graphs while leaving tables to render during SSR. Import `afterNextRender` and `signal` from `@angular/core`, then add this to the hosting component:

  ```typescript
  /** Indicates that browser-only Pantry components may render after hydration. */
  public readonly hydrated = signal(false);

  /** Initializes the browser-only section after the first client render. */
  public constructor() {
    afterNextRender(() => this.hydrated.set(true));
  }
  ```
- Visual fidelity first.
- If the provided view is mobile, treat it as a **PWA screen** and build with mobile app behavior/layout expectations.
- Enforce **mobile-first development** for mobile screens (base layout/styles for mobile first, then scale up only when needed).
- Do not fixate on one exact device size; keep behavior responsive across common mobile widths unless instructed otherwise.
- Gradient buttons and other gradient treatments are allowed when the design calls for them. Define or reuse each semantic gradient under `theme.extend.backgroundImage` in the existing `tailwind.config.js`, then consume its generated `bg-<token>` utility through SCSS `@apply`; do not hardcode gradients in templates, component SCSS, or TypeScript.
- Use only variants documented by the selected Pantry component; a Tailwind color or gradient token is not a component `variant` value. For the Pantry button's built-in brand gradient, use `variant="primary"`.
- Do not combine Pantry Button `variant="gradient"` with `color="custom"`: the current Pantry CSS applies `.btn--custom-color` after `.btn--gradient`, clears `background-image`, and leaves the button transparent. If Pantry cannot represent a required custom gradient through a documented API, use a semantic Tailwind gradient on a native button as allowed by the Component Pantry contract; never override Pantry internals.

---

## Output location
Generate into:
- `<project_name>/` (provided by backend prompt as Output dir)

Inside that page folder:
- page component files
- `constants/`
- `interfaces/`
- `components/` (one folder per major screen section, each with TS, HTML, SCSS, and spec files)

`components/` must be at the same level as `constants/` and `interfaces/`. Every child component must use its own folder with colocated TS, HTML, SCSS, and spec files.
Do not create another nested `pages/...` path inside `page_dir`.

For icons:
- include `icons-sprite.svg` in the final ZIP output
- keep HTML references as `assets/icons/icons-sprite.svg#<icon-id>`

---

## Efficient execution workflow
Follow these phases in order and do not revisit a completed phase:

1. **Inspect once**
   - Batch independent reads.
   - Inspect the Angular version, project structure, SSR/prerender configuration, and browser-only Pantry compatibility up front.
   - Use the component list above to map every UI element and record the selected components and exact imported types before coding.
   - Prefer component references over declaration files; inspect typings only when a required API detail is missing.
   - Do not create a checklist file.

2. **Implement in batches**
   - Batch boilerplate (interfaces, constants, barrel exports, and specs) where possible.
   - Implement major visual sections in two batches: shell/header/metrics first, then analytics/table/toolbar. Do not squeeze all visual sections into one generation turn.
   - Allow one visual-fidelity fix batch before validation. Do not serialize independent boilerplate writes.
   - Read the current target block immediately before an exact-text edit instead of guessing its formatting.
   - Finish implementation, documentation, Pantry replacement, routing cleanup, and SVG generation before validation.

3. **Validate once**
   - Do not run Prettier; the backend formats non-SVG source files after generation.
   - Run one `npx tsc -p tsconfig.app.json --noEmit` check.
   - Run one combined audit for Pantry/native-control overlap, obsolete dashboard references, required tests, and unique SVG symbol IDs.
   - Fix findings before building; do not repeat checks that already passed.

4. **Build and stop**
   - Run one final `npm run build`; never rely on a global `ng` executable.
   - If the build fails, fix the root cause. Before rebuilding, append every newly resolved build error to [KNOWN-ERRORS.md](./references/KNOWN-ERRORS.md), including the error/symptom, root cause, verified fix, and a rule that prevents recurrence. Do not duplicate an existing entry.
   - If the build succeeds, reply `done` immediately. Do not perform more reads, audits, formatting, refactors, or tool calls.
   - Rebuild only when a failed build requires a source or configuration change.
   - If a stylesheet budget is exceeded, increase the budget in `angular.json` instead of moving or reducing styles.

Do not run git commands.

---

## Generation contract
- Do not delete existing files unless the task explicitly requires removing obsolete scaffold files.
- Only patch existing files and create missing files.
- Complete the workflow above, then reply only: `done`.
- Do not continue the conversation.
