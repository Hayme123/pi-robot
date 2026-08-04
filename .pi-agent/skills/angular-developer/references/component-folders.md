# Component Folders

## Required screen decomposition

Every generated screen must use a component folder for its page shell and for each distinct UI section or interactive unit shown on the screen. A component is a meaningful visual/interaction boundary: for example a header, toolbar, filters, summary area, chart panel, table, tab panel, or modal content. Do not put the whole screen in one page component.

Do not create a wrapper component around a single Pantry component with no screen-specific composition or behavior. Use the documented `ntv-*` component directly in its owning screen component instead.

## Structure

```text
src/app/features/<feature-name>/
  <feature-name>.component.ts
  <feature-name>.component.html
  <feature-name>.component.scss
  <feature-name>.component.spec.ts
  components/
    <section-name>/
      <section-name>.component.ts
      <section-name>.component.html
      <section-name>.component.scss
      <section-name>.component.spec.ts
```

- Every component folder contains colocated TypeScript, HTML, SCSS, and spec files.
- Keep the page component as the composition shell; child components own their section markup, styles, and minimal UI state.
- Use short kebab-case names based on the UI section, and export child components through the feature barrel when the scaffold uses barrels.
- Put feature-wide static configuration in `constants/` and types in `interfaces/`; do not create folders for decorative fragments or one-line markup.
