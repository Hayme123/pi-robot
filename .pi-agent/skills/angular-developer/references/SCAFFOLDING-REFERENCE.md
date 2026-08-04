# Scaffolding Reference

---

## 1. Naming

### Screen / feature names
- Derive names from the real page or section name.
- Strip frame suffixes and runner artifacts.
- Use simple, short kebab-case feature names.

Examples:
- `dashboard`
- `hosts`
- `advertisers`
- `single-host`
- `single-advertiser`

Do not use:
- `dashboard-frame-01`
- `hosts-frame-01`
- `advertisers_frame_01`

### Angular names
- Class name: keep it short like: `DashboardComponent`, `HostsComponent`, `AdvertisersComponent`, `DetailsComponent`, `HoursComponent`
- Do not add frame/job/generated suffixes to class names.
- Do not over-describe class names when a shorter obvious name fits the screen or subview.
- Selector: `app-dashboard`, `app-hosts`, `app-advertisers`
- Root SCSS block: keep it short like: `.dashboard`, `.hosts`, `.advertisers`, `.details`, `.hours`
- Use one primary BEM block name per component.
- That block name should match the same short feature name used by the component/file whenever possible.
- HTML/SCSS class names should stay short, direct, and feature-based.
- Do not use bloated class names copied from frame/job wording.
- Main files: `<feature>.component.ts/html/scss/spec.ts`

---

## 2. Folder structure

Use the existing WARP project structure:

```text
src/
  app/
    core/
      guards/
      interceptors/
      models/
      services/
    features/
      <feature-name>/
        <feature-name>.component.ts
        <feature-name>.component.html
        <feature-name>.component.scss
        <feature-name>.component.spec.ts
        index.ts
        constants/
          *.constants.ts
          index.ts
        interfaces/
          *.interface.ts | *.interfaces.ts
          index.ts
        components/              # required: page-only child components, one folder per UI section
          <child-component>/
            <child-component>.component.ts
            <child-component>.component.html
            <child-component>.component.scss
            <child-component>.component.spec.ts
    layout/
      authenticated/
      public/
    shared/
      components/
      directives/
      pipes/
  assets/
    icons/
      icons-sprite.svg
```

Rules:
- Root for generated page files is `src/app/features/`.
- Each generated page uses `src/app/features/<feature-name>/`.
- Register feature routes in the appropriate `src/app/layout/*/*.routes.ts` file.
- Use `interfaces/` as the canonical folder name.
- Use `index.ts` barrel exports where the scaffold already uses them.
- `components/` is optional and is for small child components within that feature.
- `components/`, `constants/`, and `interfaces/` are at the same feature-folder level.
- Each distinct UI section or interactive unit has its own folder under `components/`, with colocated TS, HTML, SCSS, and spec files.
- `icons-sprite.svg` is at `src/assets/icons/icons-sprite.svg`.
- Nested `tabs/` are allowed when the feature naturally contains tabbed subviews.
- Keep constants under `constants/`, not mixed into the feature root unless there is only a single trivial constants file.
- Do not delete existing scaffold files, except obsolete dashboard files and directories when migrating the scaffold dashboard to a different feature name.

---

## 3. Component architecture

### Standalone components
- Use `standalone: true` on generated components.
- Use `styleUrl` / `templateUrl` with the local component files.
- Import dependencies explicitly in the component decorator.

### Dependency style
- Use `inject()` for services and framework dependencies.
- Prefer signals/computed for reactive state.
- Use `DestroyRef` + `takeUntilDestroyed()` for subscription cleanup when subscribing.

### Lifecycle
- Fully implement lifecycle methods when needed.
- Do not leave stub handlers or placeholder lifecycle bodies.

### Component/tabs split discipline
- Do not enforce a hard line-count limit.
- Split each page into clear child components/tabs based on UI sections and interaction boundaries.
- Create a `components/` folder for every screen and place each distinct section or interactive unit in its own child-component folder.
- Use parent containers for orchestration and keep feature logic grouped by section.
- Move static config into `constants/` and types into `interfaces/`.

---

## 4. UI component priority

### NTV first
- Use `@ntv360/component-pantry` components first whenever an NTV component fits.
- Do not replace an appropriate NTV primitive with raw HTML.
- Do not introduce third-party UI libraries.

### Shared app components
- If the scaffold already uses an existing app-level wrapper for a screen pattern (for example table/toolbar/stats wrappers), keep that wrapper only when it is already part of the target scaffold.
- Do not invent new shared wrappers unless the target scaffold explicitly requires them.

---

## 5. HTML rules

### SCSS only
- HTML receives semantic/BEM classes only.
- Do not place Tailwind utility classes directly in HTML.
- Do not use static inline styles.

### data-testid
- Add `data-testid` to every user-interactive component/element.
- This includes controls like buttons, dropdowns, breadcrumbs links, tables, and interactive table controls/columns.
- Do not add `data-testid` to passive wrappers, layout containers, labels, or decorative spans.
- Keep names lowercase, hyphenated, and **5 words max**.

Good:
- `hosts-add-btn`
- `hosts-table`
- `advertisers-create-btn`
- `dashboard-range-dd`

Bad:
- `dashboard-graph-header-value-span`
- `hosts-flex-div-4`
- `advertisers-table-body-wrapper`

### Control flow
- Use `@if`, `@else`, `@for`.
- Do not use `*ngIf` / `*ngFor` in generated output.

### SVG sprite usage
- Use `<svg><use ...></use></svg>` references that point to `assets/icons/icons-sprite.svg#<icon-id>`.
- Angular bindings are allowed, e.g. `[attr.xlink:href]="'assets/icons/icons-sprite.svg#' + btn.icon"`.
- Never use text characters, Unicode symbols, or emoji as visual icons.
- Prefer supplied symbol IDs. If none matches a required icon, add one faithful SVG `<symbol>` with a unique kebab-case ID to `src/assets/icons/icons-sprite.svg`; do not alter existing symbols.
- Include `icons-sprite.svg` in ZIP packaging output.
- Keep HTML reference path format as `assets/icons/icons-sprite.svg#<icon-id>`.

---

## 6. SCSS rules

- Use SCSS with BEM structure.
- Use `@apply` for Tailwind utilities in SCSS.
- Use raw CSS only when Tailwind cannot express the needed value.
- `::ng-deep` is allowed only for NTV internal overrides.
- Keep responsive breakpoints at minimum:
  - `1200px`
  - `768px`

---

## 7. Typing and constants

- Prefer typed constants and typed interfaces.
- Table column constants should be typed as `TableColumn[]`.
- Keep reusable static configuration in `constants/`.
- Keep interfaces/types in `interfaces/`.
- Keep icon constants typed appropriately for their usage pattern.
- Use path aliases for local app imports where available.

---

## 8. Sample-driven patterns to preserve

Carry forward these patterns from the samples:
- stats cards at top-level screen sections
- table + toolbar layout blocks
- analytics panel blocks with explicit loading states
- nested detail screens and tab subcomponents when the design implies them
- constants and interfaces extracted from the component root
- sprite-based SVG usage with `src/assets/icons/icons-sprite.svg`
- template references like `assets/icons/icons-sprite.svg#<icon-id>`

---

## 9. Do not inherit old sample mistakes

Do not copy these if found in old samples:
- utility classes directly in HTML
- overlong or wrapper-only `data-testid`
- singular/plural folder naming drift like `interface/`
- stray typos such as malformed `index.ts` filenames
- frame suffixes in generated screen/component names
