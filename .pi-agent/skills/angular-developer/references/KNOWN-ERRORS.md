# Known Build Errors & Fixes

> **Read this before generating any component code.**
> These are verified, real-world errors encountered when building scaffolded Angular components
> using `@ntv360/component-pantry`. Avoid all patterns listed under ❌. Use only the ✅ patterns.

---

## ERR-002 — `ntv-dropdown (selectionChange)` Type Mismatch

**Severity:** Medium — TypeScript strict-mode error, breaks build

**Root Cause:**
`(selectionChange)` emits a `DropdownOption | null`. Typing the handler as `(event: any)`
or `(event: DropdownOption)` without null causes TS errors in strict mode.

❌ Wrong:
```typescript
public onTimezoneChange(event: any): void { ... }
public onTimezoneChange(event: DropdownOption): void { ... }
```

✅ Correct:
```typescript
import { DropdownOption } from '@ntv360/component-pantry';

public onTimezoneChange(event: DropdownOption | null): void {
  this.selectedValue.set(event?.value?.toString() ?? null);
}
```

**Rule:** Always type `(selectionChange)` handlers as `DropdownOption | null` and safely extract `.value`.

---

## ERR-003 — `ntv-date-range-picker` Does Not Exist

**Severity:** High — `NG8001: 'ntv-date-range-picker' is not a known element`

**Root Cause:**
The selector `ntv-date-range-picker` does not exist in the library. The correct component
for all date range selection is `ntv-date-picker` with `variant="date-range-single"`.

❌ Wrong:
```html
<ntv-date-range-picker ...></ntv-date-range-picker>
```

✅ Correct:
```html
<ntv-date-picker
  variant="date-range-single"
  [canSelectPrevDates]="true"
  (selectedDates)="onDateRangeChange($event)">
</ntv-date-picker>
```

Handler:
```typescript
public onDateRangeChange(dates: any): void {
  this.startDate.set(dates?.startDate ?? null);
  this.endDate.set(dates?.endDate ?? null);
}
```

**Rule:** Never use `ntv-date-range-picker`. Always use `<ntv-date-picker variant="date-range-single">`.

---

## ERR-004 — `ntv-table` Column / Data Type Errors

**Severity:** Medium — TypeScript strict-mode errors on `TableColumn` interface

### ERR-004a — `sortable` is not on `TableColumn`
`sortable` does not exist in the `TableColumn` interface. Including it causes a TS error.

❌ Wrong:
```typescript
{ field: 'name', header: 'Name', sortable: true }
```

✅ Correct:
```typescript
{ field: 'name', header: 'Name' }
```

### ERR-004b — Invalid `TableColumn` shape causes strict-mode mismatch
Strict-mode errors around table columns are usually caused by invalid column fields or unsupported union values, not by `TableColumn[]` itself.

❌ Wrong:
```typescript
tableColumns: TableColumn[] = [
  { field: 'name', header: 'Name', sortable: true },
];
```

✅ Correct:
```typescript
tableColumns: TableColumn[] = [
  { field: 'name', header: 'Name' },
];
```

**Rule:** Prefer typed `TableColumn[]`. Only widen to `any[]` as a last-resort local workaround when a verified pantry typing bug leaves no clean typed option.

---

## ERR-005 — `ntv-tabs` Wrong Input Bindings

**Severity:** High — tabs don't render or throw NG8002

**Root Cause:**
The docs show `[headers]` and `[activeTab]`, but the actual library uses `[tabs]` and `[activeIndex]`.

❌ Wrong (from docs):
```html
<ntv-tabs [headers]="tabHeaders" [activeTab]="activeIndex"></ntv-tabs>
```

✅ Correct (verified working):
```html
<ntv-tabs
  [tabs]="tabHeaders"
  [activeIndex]="activeIndex()"
  (tabChange)="onTabChange($event)">
</ntv-tabs>
```

**Rule:** Use `[tabs]` and `[activeIndex]`. Never use `[headers]` or `[activeTab]`.

### ERR-005a — Duplicate `ntv-tabs` Bottom Border

`ntv-tabs` supplies its own bottom border. Do not add a second border on its wrapper.

❌ Wrong:
```scss
&__tabs {
  @apply border-b border-neutral-300;
}
```

✅ Correct: omit the wrapper border.

**Rule:** Do not apply `border-b border-neutral-300` to an `ntv-tabs` wrapper.

---

## ERR-024 — BEM Modifier Omits Base SVG Sizing

**Severity:** Medium — SVG uses its oversized browser default dimensions

**Root Cause:**
A selector such as `.summary__stat-value svg` does not match when the template assigns only
`.summary__stat-value--trend-up`. The SVG sizing rules are therefore never applied.

❌ Wrong:
```typescript
public getStatClass(stat: PlaylistSummaryStat): string {
  return `summary__stat-value--${stat.tone}`;
}
```

✅ Correct:
```typescript
public getStatClass(stat: PlaylistSummaryStat): string {
  return `summary__stat-value summary__stat-value--${stat.tone}`;
}
```

**Rule:** When styles target a BEM base class, dynamic modifier classes must include that base class.

---

## ERR-008 — `ntv-graph [config]` Signal Cast Error

**Severity:** Medium — TypeScript generic mismatch, breaks build in strict mode

**Root Cause:**
`ntv-graph` expects `[config]` typed as `signal<GraphConfig>`. Passing a plain object
or a loosely typed signal causes a TS generic mismatch.

❌ Wrong:
```typescript
public graphConfig = { variant: 'line', ... };
```

✅ Correct:
```typescript
import { signal } from '@angular/core';
public graphConfig = signal<any>({ variant: 'line', ... });
```

In template:
```html
<ntv-graph [config]="graphConfig"></ntv-graph>
```

**Rule:** Always wrap `ntv-graph` config in `signal<any>()`.

---

## ERR-009 — `ntv-searchbar (searchValueChange)` Event Type

**Severity:** Low — TypeScript type error or runtime undefined if extracted incorrectly

**Root Cause:**
`(searchValueChange)` may emit either a plain `string` or an object `{ searchTerm: string }` 
depending on the version and mode. Handling only one breaks the other.

❌ Wrong — crashes if object is emitted:
```typescript
public onSearch(value: string): void {
  this.query.set(value);
}
```

✅ Correct — handles both:
```typescript
public onSearch(event: any): void {
  const value = typeof event === 'string'
    ? event
    : (event?.searchTerm ?? event?.value ?? '');
  this.query.set(value);
}
```

In template — always pass `$event` as-is:
```html
<ntv-searchbar (searchValueChange)="onSearch($event)"></ntv-searchbar>
```

**Rule:** Always type `onSearch` as `(event: any)` and resolve string/object inside the handler.

---

## ERR-011 — `DatePicker` Not in `imports[]` Array (`NG8001` / `NG8002`)

**Severity:** High — `NG8001: 'ntv-date-picker' is not a known element` + cascading NG8002

**Root Cause:**
`DatePicker` was imported at the top of the `.ts` file but was **not added to the `imports[]`
array** of the `@Component` decorator. In Angular standalone components, every external UI
component used in the HTML template must be explicitly listed in `imports[]`.

❌ Wrong — imported but not in `imports[]`:
```typescript
import { DatePicker } from '@ntv360/component-pantry';

@Component({
  standalone: true,
  imports: [CommonModule, Button, Searchbar],  // ← DatePicker missing
})
```

✅ Correct:
```typescript
import { DatePicker } from '@ntv360/component-pantry';

@Component({
  standalone: true,
  imports: [CommonModule, Button, Searchbar, DatePicker],  // ← required
})
```

**Rule:** Every pantry component used in the template MUST appear in `imports[]`.
A top-level `import` statement alone is not sufficient.

---

## ERR-012 — `ntv-date-picker` Invalid `[showTime]` Binding (`NG8002`)

**Severity:** Medium — `NG8002: Can't bind to 'showTime' since it isn't a known property`

**Root Cause:**
`[showTime]` is not a valid `@Input()` on `ntv-date-picker`. Binding it causes NG8002.

❌ Wrong:
```html
<ntv-date-picker
  variant="date-range-single"
  [showTime]="false"
  (selectedDates)="onDateRangeChange($event)">
</ntv-date-picker>
```

✅ Correct — omit `[showTime]` entirely:
```html
<ntv-date-picker
  variant="date-range-single"
  [canSelectPrevDates]="true"
  (selectedDates)="onDateRangeChange($event)">
</ntv-date-picker>
```

**Verified valid inputs for `ntv-date-picker`:** `variant`, `[canSelectPrevDates]`, `size`, `(selectedDates)`.

**Rule:** Do NOT bind `[showTime]` on `ntv-date-picker`.

---

## General Rules (Apply to Every Generated Component)

| # | Rule |
|---|---|
| 1 | Create `SafeHtmlPipe` only when trusted SVG/HTML is rendered through `[innerHTML]`; apply `\| safeHtml` on those bindings |
| 2 | Add `@use "sass:color";` at the top of every SCSS file using color functions |
| 3 | Never use `darken()` or `lighten()` — use `color.adjust()` instead |
| 4 | Prefer typed table data/interfaces; only widen locally when a verified library typing bug forces it |
| 5 | Prefer `TableColumn[]`; fix invalid column props before falling back to `any[]` |
| 6 | Use `[tabs]` and `[activeIndex]` for `ntv-tabs`, NOT `[headers]` / `[activeTab]` |
| 7 | Use `<ntv-date-picker variant="date-range-single">` for ranges — never `<ntv-date-range-picker>` |
| 8 | Cast `ntv-graph [config]` as `signal<any>()` |
| 10 | **Use BEM CSS naming** — HTML receives only BEM class names, all styling via `@apply` in SCSS |
| 11 | Always type grouped icon object as `public readonly icons: any = ICON_OBJECT` when used with dynamic bracket access in templates |
| 12 | `ntv-dropdown (selectionChange)` → type handler as `DropdownOption \| null`, extract `.value?.toString()` |
| 13 | `ntv-table (rowClick)` → type handler as `any`, not `Record<string, unknown>` |
| 14 | `ntv-searchbar (searchValueChange)` → pass `$event` as-is in template, resolve string/object in handler |
| 15 | `DatePicker` must be in the `imports[]` array of `@Component` — not just imported at the top of the TS file |
| 16 | `ntv-date-picker` does NOT accept `[showTime]` — omit it entirely |
| 17 | After every scaffold + `npm install`: run Stage 0.5 pantry infrastructure setup (symlinks + peer deps) |
| 18 | NTV components accept `[config]` as an object map — use bracket access `buttonConfigs['key']` in template |
| 19 | Define component configs (buttonConfigs, dropdownConfigs, etc.) in `.constants.ts` or `.interfaces.ts` as typed objects |
| 20 | For `ntv-table`, default to built-in rendering + `[showColumnSettings]="true"`; do not create custom row/body templates or custom column-settings buttons unless explicitly requested |
| 21 | Do not add `border-b border-neutral-300` to an `ntv-tabs` wrapper; the component renders its own border |
| 22 | When dynamic BEM modifiers are used, include the base class when it owns descendant styling (for example, SVG sizing) |

---

## ERR-014 — NTV Component Real-World Fixes (UserManagement Dashboard)


These errors were encountered and fixed in a real generated dashboard. Apply these patterns:


### ERR-014a — `ntv-dropdown` Type Mismatch

**Symptom:** `DropdownOption | null` vs `UserManagementDropdownOption` type mismatch on `onTimeRangeChange`.

**Fix:** Cast the handler to accept `DropdownOption | null` and extract the value:

```typescript
public onTimeRangeChange(event: DropdownOption | null): void {
  const rawValue = event?.value;
  this.timeRangeFilterValue.set(
    typeof rawValue === 'string' ? rawValue as TimeRangeFilterValue : (rawValue ?? null)
  );
}
```

**Rule:** `ntv-dropdown (selectionChange)` always emits `DropdownOption | null`. Cast and normalize inside handler.


---

### ERR-014b — `ntv-searchbar` Event Payload Type Mismatch

**Symptom:** `(searchValueChange)` emits `string` in some modes, `{ searchTerm: string }` in others.

**Fix:** Normalize to string inside the handler:

```typescript
public onPrimarySearchChange(event: string | { searchTerm: string }): void {
  const searchTerm = typeof event === 'string'
    ? event
    : (event?.searchTerm ?? '');
  this.primarySearchQuery.set(searchTerm);
}
```

**Rule:** Accept `string | event payload`, normalize to string.

---


### ERR-014c — `ntv-searchbar` Input Type Errors (borderRadius / size / nullable colors)

**Symptom:** Nullable or invalid type values for `borderRadius`, `size`, color props.


**Fix:** Use literal string defaults and safe fallbacks:

```html
<ntv-searchbar
  borderRadius="md"
  size="md"
  [searchButtonColor]="searchButtonColor ?? 'primary'"
  [placeholderColor]="placeholderColor ?? 'neutral'"
  ...>
</ntv-searchbar>
```

**Rule:** Always provide literal defaults for `borderRadius` and `size`. Use null-coalescing for nullable color props.

---


### ERR-014d — `ntv-table` Data Type Mismatch

**Symptom:** `UserManagementEmployee[]` passed to table expecting `Record<string, unknown>[]`.


**Fix:** Create an adapter signal that normalizes the data:

```typescript
public filteredEmployeeRecords = computed(() =>
  this.employeeRecords().map((rec: any) => ({
    ...rec,
    dob: rec.dob ?? null,
    email: rec.email ?? null,
  }))
);
```

Bind the table to the adapter, not the raw source:

```html
<ntv-table
  [data]="filteredEmployeeRecords()"
  [columns]="tableColumns">
</ntv-table>
```

**Rule:** Always create an adapter (`.map()` + `.computed()`) when the table expects a different type than the source.

---


### ERR-014e — `ntv-table` `rowTemplate` Not Supported

**Symptom:** `rowTemplate` input does not exist on `ntv-table`.


**Fix:** Use Angular named template outlet (`#body`):

```html
<ntv-table [data]="filteredEmployeeRecords()" [columns]="tableColumns">
  <ng-template #body let-row>
    <tr class="table-row">
      <td>{{ row.name }}</td>
      <td>{{ row.email }}</td>
      <td>{{ row.department }}</td>
      <td class="table-row__actions">
        <ntv-button
          [config]="buttonConfigs['view']"
          (buttonClick)="onViewEmployee(row)">
        </ntv-button>
      </td>
    </tr>
  </ng-template>
</ntv-table>
```

**Rule:** Never use `rowTemplate`. Use `<ng-template #body let-row>` only when custom row rendering is explicitly requested.

---


### ERR-014f — `buttonConfigs` Index Signature Type Error

**Symptom:** `buttonConfigs.*` causes implicit `any` index signature error.


**Fix:** Use bracket access in template — TypeScript allows it on typed index signatures:

```html
<ntv-button
  [config]="buttonConfigs['addUser']"
  (buttonClick)="onAddUser()">
</ntv-button>


<ntv-button
  [config]="buttonConfigs['filter']"
  (buttonClick)="onFilter()">
</ntv-button>
```

**Rule:** Always use bracket notation `buttonConfigs['key']` in template, not dot notation.


---


### ERR-014g — Route Import/Export Mismatch


**Symptom:** `app.routes.ts` cannot find `UserManagementFrame01Component` export.


**Fix:** Import from the dashboard folder's `index.ts` barrel:

```typescript
import { UserManagementFrame01Component } from './dashboard/user-management-frame01/';
```

Make sure `index.ts` re-exports the component:
```typescript
// dashboard/user-management-frame01/index.ts
export * from './user-management-frame01.component';
```

**Rule:** Always re-export components via the folder `index.ts` barrel. Import from the barrel, not the direct file.

---

## ERR-015 — `ntv-table` Column Hiding Removes Header Only (Row Cells Stay Visible)

**Symptom:** Setting `visible: false` on a column hides the header text but row cells remain visible.

**Root Cause:** The table body uses hard-coded `<td>` elements. When a column is hidden, only the `<th>` is removed — row cells are not bound to the columns list.

❌ Wrong — hard-coded row cells:
```html
<tr>
  <td>{{ row.name }}</td>
  <td>{{ row.department }}</td>
  <td>{{ row.status }}</td>
</tr>
```

✅ Correct — render row cells from the columns list:
```html
<ntv-table [data]="filteredRecords()" [columns]="tableColumns">
  <ng-template #body let-row let-columns="columns">
    <tr>
      <td *ngFor="let col of columns">
        {{ row[col.field] }}
      </td>
    </tr>
  </ng-template>
</ntv-table>
```

Or using the `let-columns` pattern with `*ngFor`:
```html
<ntv-table [data]="employeeRecords()" [columns]="tableColumns">
  <ng-template #body let-row>
    <tr class="table-row">
      <td *ngFor="let col of columns" class="table-row__cell">
        {{ row[col.field] }}
      </td>
    </tr>
  </ng-template>
</ntv-table>
```

**Rule:** Default to built-in `ntv-table` rendering. Only use custom `#body` row templates (with `columns` + `*ngFor`) when explicitly requested.

---

## ERR-016 — Component Config & DatePicker Type/Input Mismatches

### ERR-016a — Local button config not assignable to `Partial<ButtonConfig>`

**Symptom:** Type error assigning local button config to pantry button config.

**Cause:** Local `variant` type was `string` (loose), while `ntv-button` expects strict union (`ButtonVariant`).

**Fix:** Replace loose `string`/inline literal usage with strict local union types and use those in your local button config interface/type.

**Typical files:**
- `<feature>.types.ts`
- `<feature>.interfaces.ts`

**Rule:** Never type button `variant` as plain `string`. Use strict union types aligned with pantry `ButtonVariant`.

---

### ERR-016b — `ntv-date-picker` input type errors

**Symptom:**
- `width="100%"` → expected `number`, got `string`
- `variant="single"` → invalid value (must be pantry-supported date-picker variants)
- `color="custom"` → invalid (`success | danger | black` supported)

**Fixes applied:**
```html
[width]="320"
variant="date-range-single"
color="black"
```

**Typical file:**
- `<feature>.component.html`

**Rule:** Use strict pantry input types for `ntv-date-picker`.

---

### ERR-016c — `selectionChange` handler type too narrow + date-picker invalid input bindings

**What broke:**

- `selectionChange` emits `DropdownOption | null` (with `value: string | number`), but handlers were typed as narrower custom option types.
- Example bad patterns:
  - `onAddEmployee(event: CustomDropdownOption | null)`
  - `onCurrencyChange(event: CustomCurrencyOption | null)`
- `ntv-date-picker` used invalid inputs:
  - `variant="single"` (invalid union)
  - `width="100%"` (string; expects number)
  - `color="custom"` (invalid union)

**How to fix:**

- Widen handler parameter types to match emitted payload shape:
```typescript
public onAddEmployee(event: { value?: string | number } | null): void {
  const value = event?.value;
  ...
}

public onCurrencyChange(event: { value?: string | number } | null): void {
  const value = event?.value;
  ...
}
```

- Update date-picker bindings:
```html
variant="date-range-single"
[width]="320"
color="black"
```

**Rule:** `selectionChange` handlers must accept the pantry-emitted shape (`DropdownOption | null` or equivalent widened structure). Date-picker inputs must use pantry-valid unions and numeric width.

---

## ERR-018 — `ntv-table` Over-Customization

**Severity:** Medium — unnecessary complexity and inconsistency

**Symptom:**
Custom row/body templates are added by default, or a separate custom column-settings button is built even though `ntv-table` already supports built-in column settings.

✅ Preferred default:
```html
<ntv-table
  [data]="records"
  [columns]="tableColumns"
  [showColumnSettings]="true">
</ntv-table>
```

**Rule:**
If there is an `ntv-table`, do not use custom row/body templates and do not build a separate custom column settings button. Use default `ntv-table` rendering with built-in column settings.

---

## ERR-017 — `inputValueChange` Emits `Event` in Some Cases (TS2345)

**Symptom:**
Template passes `$event`:

```html
(inputValueChange)="onQuickSearchChange($event)"
```

But handler was typed as `string`, so Angular inferred an `Event` payload and TypeScript failed:
`TS2345: Argument of type 'Event' is not assignable to parameter of type 'string'`.

**Fix:**
Accept `string | Event` and normalize to a string in the handler:

```typescript
public onQuickSearchChange(event: string | Event): void {
  const value = typeof event === 'string'
    ? event
    : ((event.target as HTMLInputElement | null)?.value ?? '');

  this.quickSearchQuery.set(value);
}
```

**Rule:** For `inputValueChange`, do not assume string-only payload. Type handler as `string | Event` and normalize.

---

## ERR-019 — `Graph` Import Mismatch + Signal Config Binding Issues (`ntv-graph`)

**Severity:** High — compile error + runtime blank graph

**Error:**
`TS2305: Module '@ntv360/component-pantry' has no exported member 'Graph'`

**Cause:**
Wrong symbol name used in `dealer-page.component.ts`.

**Fix:**
Replace `Graph` with `GraphComponent` in both:
- import list
- standalone component `imports: []`

### ERR-019a — Side Effect: `ntv-graph` Not Behaving as Angular Component

**Cause:**
Component was not properly registered because `Graph` import failed.

**Fix:**
Explicitly import and register `GraphComponent`.

### ERR-019b — Signal Inputs Passed as Function Reference Instead of Value

**Cause:**
Template used signal reference instead of signal value:
- `[config]="progressGraphConfig"`
- `[config]="riskGraphConfig"`

**Fix:**
Invoke the signals in template:
- `[config]="progressGraphConfig()"`
- `[config]="riskGraphConfig()"`

### ERR-019c — Runtime Display Issue: Graph Appears Blank

**Cause:**
Graph container had no guaranteed drawable height.

**Fix:**
Set minimum height on `ntv-graph` in dealer page SCSS:
```scss
ntv-graph {
  min-height: 320px;
}
```

**Rule:**
- Always import `GraphComponent` (never `Graph`) from `@ntv360/component-pantry`.
- For signal-backed graph configs, always pass evaluated value in templates (`configSignal()`).
- Ensure `ntv-graph` has explicit/minimum height to avoid blank render.

---

## ERR-021 — `ntv-graph` Variant Must Use the Typed Enum

**Severity:** High — TypeScript build failure

**Symptom:** A string variant such as `line-with-filter-legend` or
`bar-with-filter-legend` is rejected as not assignable to `GraphVariant`.

❌ Wrong:
```typescript
variant: 'line-with-filter-legend'
variant: 'bar-with-filter-legend'
```

✅ Correct:
```typescript
import { GraphVariant } from '@ntv360/component-pantry';

variant: GraphVariant.LineWithFilterLegend
variant: GraphVariant.BarWithFilterLegend
```

**Rule:** Never guess `ntv-graph` variant strings. Import and use the documented `GraphVariant` enum member.

---

## ERR-028 — `ntv-table` Body Template Hides Column Settings

**Symptom:** The table's built-in column settings button does not appear.

**Root Cause:** A projected `<ng-template #body>` replaces the table's built-in rendering.

✅ Correct — use the built-in table body when column settings are required:
```html
<ntv-table
  [data]="records"
  [columns]="tableColumns"
  [showColumnSettings]="true">
</ntv-table>
```

**Rule:** Do not add a `#body` template to an `ntv-table` that needs its built-in settings button. Keep the action column in the table data/columns unless custom row rendering is explicitly required.

---

## ERR-023 — Do Not Format SVG Sprites with Prettier

**Severity:** Low — formatting command fails

**Symptom:** `prettier --write src/assets/icons/icons-sprite.svg` fails because no parser can be inferred.

**Rule:** Do not run Prettier on `icons-sprite.svg`. Format changed TypeScript, HTML, SCSS, JSON, and supported files only.

---

## ERR-024 — Font Awesome Sprite Icon IDs Must Include Their Style Suffix

**Severity:** Medium — icon does not render

**Symptom:** An icon reference such as `assets/icons/icons-sprite.svg#folder` is blank because the sprite defines `#folder-regular` instead. The same applies to all Font Awesome icons.

**Rule:** Inspect the generated sprite and use its exact symbol ID, including the style suffix, such as `#folder-regular`.

---

## ERR-020 — Pantry Export Name Mismatch (`TS2305` + `NG1010`)

**Severity:** High — compile-time failure in standalone component imports

**What broke:**

Components were imported using symbols that are **not exported** by `@ntv360/component-pantry`:
- `NtvButtonComponent`
- `NtvCardComponent`
- `NtvDropdownComponent`
- `NtvInputComponent`
- `NtvTextareaComponent`

TypeScript raised `TS2305` for missing exports. Because those symbols were invalid, Angular standalone `imports: [...]` could not resolve metadata and triggered `NG1010`.

**Fix:**

Use the actual exported pantry symbols:
- `NtvButtonComponent` → `Button`
- `NtvCardComponent` → `Card`
- `NtvDropdownComponent` → `Dropdown`
- `NtvInputComponent` → `Input`
- `NtvTextareaComponent` → `Textarea`

Also update the component `imports: [...]` arrays to use these same valid symbols.

**Rule:** Never assume `Ntv*Component` export names. Verify and import the real pantry exports, then mirror those exact symbols in standalone `imports[]`.

---

## ERR-025 — ChromeHeadless Cannot Run as Root in Docker/CI

**Severity:** High — Karma builds the tests but cannot launch the browser, so no tests execute

**Symptom:**
```text
Running as root without --no-sandbox is not supported.
ChromeHeadless failed 2 times (cannot start). Giving up.
```

**Root Cause:**
Chrome's sandbox refuses to start when the container runs as `root`.

**Preferred Fix:** Run the container as a non-root user so Chrome's sandbox remains enabled.

**Trusted, isolated Docker/CI workaround:** Create `karma.conf.cjs`:

```javascript
module.exports = (config) => {
  config.set({
    customLaunchers: {
      ChromeHeadlessNoSandbox: {
        base: 'ChromeHeadless',
        flags: ['--no-sandbox', '--disable-setuid-sandbox'],
      },
    },
  });
};
```

Add the config to the Angular project's `test.options` in `angular.json`:

```json
"karmaConfig": "karma.conf.cjs"
```

Run the tests with the custom launcher:

```bash
npm test -- --watch=false --browsers=ChromeHeadlessNoSandbox
```

**Rule:** Prefer a non-root container. Use `ChromeHeadlessNoSandbox` only in a trusted, isolated Docker/CI environment; never disable Chrome's sandbox on a shared or untrusted host.

---

## ERR-026 — Padding on `ntv-card` Creates a Nested Outline

**Severity:** Medium — visual defect caused by styling the Pantry component host

**Root Cause:**
Applying padding directly to `<ntv-card>` exposes its internal card element and creates a nested outline.

❌ Wrong:
```html
<ntv-card class="summary__card">
  <!-- card content -->
</ntv-card>
```

```scss
.summary__card {
  @apply min-w-0 p-5;
}
```

✅ Correct — move padding to an inner wrapper:
```html
<ntv-card class="summary__card">
  <div class="summary__content">
    <!-- card content -->
  </div>
</ntv-card>
```

```scss
.summary__card {
  @apply min-w-0;
}

.summary__content {
  @apply p-5;
}
```

**Rule:** Do not apply content padding directly to `ntv-card`. Put the padding on an inner content wrapper.

---

## ERR-027 — Table Summary Uses a Semantic `<footer>`

**Severity:** Low — incorrect structure for table-specific supporting content

**Root Cause:**
A summary or action belonging only to a table is marked up as a page or section `<footer>` instead of being placed directly below the table card.

❌ Wrong:
```html
</ntv-card>
<footer class="table-section__footer">
  <span>{{ footerSummary }}</span>
  <ntv-button
    variant="description"
    size="xs"
    data-testid="playlist-show-more"
    (buttonClick)="onShowMore()">
    {{ footerAction }}
  </ntv-button>
</footer>
```

✅ Correct:
```html
</ntv-card>
<div class="table-section__footer">
  <span>{{ footerSummary }}</span>
  <ntv-button
    variant="description"
    size="xs"
    data-testid="playlist-show-more"
    (buttonClick)="onShowMore()">
    {{ footerAction }}
  </ntv-button>
</div>
```

**Rule:** If supporting content belongs to the table, do not use `<footer>`. Place a structural `<div>` directly below the table card.

---

### Build status after fixes

- TypeScript/template errors are resolved.
- Remaining failures can still be unrelated budget errors:
  - initial bundle exceeds configured max
  - `<feature>.component.scss` exceeds configured style budget

---

## ERR-029 — Pantry Searchbar Event Inferred as Event

**Severity:** Medium — Angular template type error during production build

**Symptom:** A `(searchValueChange)="$event"` binding inferred `Event`, while the handler accepted only a string or custom search payload.

**Root Cause:** The pantry output typing and Angular template event inference differ between compilation paths.

**Fix:** Accept `string | Event | { searchTerm: string }` and normalize string, custom payload, and input-event values in the handler.

**Rule:** Searchbar value-change handlers must accept the inferred `Event` payload as well as string-like pantry payloads.

---

## ERR-030 — Pantry Component Missing from Standalone Imports

**Symptom:** Angular reports an NTV element as unknown and flags its inputs as invalid during the production build.

**Root Cause:** The component was imported in the feature source but omitted from the standalone component's `imports` array.

**Fix:** Import the actual pantry symbol and add it to the same component's `imports` array.

**Rule:** Every pantry component used in a standalone template must be present in that component's `imports` array.

## ERR-031 — Tailwind Nested Color Theme Lookup

**Symptom:** Angular Sass reports that `colors.robot-orange` does not exist in the theme config.

**Root Cause:** A nested Tailwind color token was referenced with a hyphenated path instead of its dot-separated path.

**Fix:** Reference nested tokens as `theme('colors.robot.orange')`.

**Rule:** Use dot notation for nested semantic color tokens in Sass `theme()` lookups.

## ERR-033 — Standalone Child Component Missing Pantry Button Import

**Symptom:** Angular reports `NG8001: 'ntv-button' is not a known element` and cascades into invalid input errors for `shadow` and `customHeight` in a child component template.

**Root Cause:** The child component template used `ntv-button`, but the standalone component imported only the other Pantry components it used.

**Verified Fix:** Import `Button` from `@ntv360/component-pantry` and add `Button` to that child component's `imports` array.

**Rule:** Every Pantry element used by each standalone child template must be imported and listed in that same component's `imports` array; parent imports do not flow into child components.

## ERR-032 — Angular RxJS Resolver Memory Allocation

**Symptom:** Production build fails in `angular-rxjs-resolution` with `Cannot read directory ".": cannot allocate memory` while resolving `rxjs/operators`.

**Root Cause:** The Angular build process can exhaust the default Node.js heap during RxJS resolution in the constrained build container.

**Fix:** Run the final build with `NODE_OPTIONS=--max-old-space-size=4096 npm run build` to provide sufficient heap for the resolver.

**Rule:** When this resolver-only allocation error occurs without a source diagnostic, rerun the build with an explicit 4 GB Node heap before changing application code.

## ERR-034 — Tailwind Theme Lookup for Nested Neutral Colors

**Symptom:** Angular Sass reports `colors.neutral-50` does not exist in the theme config.

**Root Cause:** A nested Tailwind color token was referenced with a hyphenated path instead of the required dot-separated path.

**Verified Fix:** Change `theme('colors.neutral-50')` to `theme('colors.neutral.50')` in the profile stylesheet.

**Rule:** Use dot notation for every nested Tailwind theme lookup, including neutral color ramps.

## ERR-035 — Pantry Card Width and Nested Flex Table Overflow

**Symptoms:**
- The internal Pantry `.card` is narrower than its `ntv-card` host.
- The projected card-content wrapper does not span the card width.
- An `ntv-table` with `tableHeight="100%"` extends beyond an enclosing card instead of using its remaining height.

**Root Causes:**
- Pantry applies `width: 100%` to its internal card only when the `fullWidth` input is enabled.
- The projected content wrapper lacks `w-full min-w-0`.
- One or more nested flex containers lack `h-full min-h-0`, so the table's percentage height has no constrained height to resolve against.

❌ Wrong:
```html
<ntv-card class="feature__card">
  <div class="feature__card-content">
    <ntv-table tableHeight="100%"></ntv-table>
  </div>
</ntv-card>
```

```scss
.feature__card-content {
  @apply flex flex-1 flex-col;
}
```

✅ Correct:
```html
<ntv-card class="feature__card" [fullWidth]="true">
  <div class="feature__card-content">
    <ntv-table class="feature__table" tableHeight="100%"></ntv-table>
  </div>
</ntv-card>
```

```scss
.outer-card__content,
.feature__card-content {
  @apply flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden;
}

.feature__table {
  @apply min-h-0 w-full min-w-0 flex-1 overflow-auto;
}
```

**Rules:**
- Set `[fullWidth]="true"` when an `ntv-card` must fill its layout width; do not override Pantry's internal `.card` class.
- Give projected card-content wrappers `w-full min-w-0`.
- Propagate `h-full min-h-0` through every nested flex container between the height-constrained outer card and a percentage-height table.
- Fix the parent height chain instead of clipping the `ntv-table` or `ntv-card` directly.
