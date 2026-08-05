---
name: html
description: Generate a faithful, responsive HTML, CSS, and JavaScript interface from a validated Figma design spec and reference image. Use the image for placement and the design spec as the source of truth.
---

# HTML, CSS, and JavaScript

## Objective

Create a static web interface using semantic HTML for structure and CSS for layout and visual styling. Do not create JavaScript or use frontend frameworks or external UI libraries unless explicitly requested.

This is a recreation task. Do not redesign, modernize, simplify, reinterpret, invent, rename, or add content.

## Input Contract

```yaml
design_spec_path: \projects\<project_name>\design_spec.json
image_path: \projects\<project_name>\frame.png
svg_path: \projects\<project_name>\svg
output_html_path: \projects\<project_name>\index.html
notes: optional constraints
```

The backend has already recursively traversed every visible Figma `children` array and validated `design_spec_path`. Read the complete design spec in chunks when necessary. Its ordered `nodes` contain stable index paths and exact Figma text, bounding boxes, colors, typography, borders, effects, and layout properties. Use it as the source of truth and never inspect the raw Figma JSON or run a JSON extraction script. Use the image only to understand layering and visual relationships. When they conflict, preserve explicit design-spec values.

## Output

By default create these complete, directly runnable files beside `output_html_path`:

- `index.html`
- `styles.css`

Do not create `script.js` unless explicitly requested. Link `styles.css` from `index.html`. Do not create other files unless required by the user.

## Requirements

- Inspect the reference image and complete design spec before coding.
- Identify page structure, components, layout, and visible interactions.
- Build semantic HTML and reproduce the design in CSS.
- **MUST:** Follow the design spec's explicit sizing values (width, height, min/max dimensions, font size, spacing, and radii) exactly. Do not infer or normalize sizing from the image when the design spec provides a value.
- Preserve exact text, spacing, colors, sizing, borders, alignment, and visual hierarchy when available.
- Use responsive layouts for desktop, tablet, and mobile. Use mobile-first styles for mobile references.
- Use semantic elements and accessible labels, buttons, inputs, and navigation.
- Reproduce visible controls as static HTML; do not implement interaction behavior unless explicitly requested.
- Use CSS variables for repeated colors, spacing, typography, and dimensions.
- Keep code clean, readable, maintainable, and free of unnecessary dependencies or abstractions.
- Do not use placeholder, lorem ipsum, emoji, guessed content, or broken asset references.
- Do not create JavaScript unless explicitly requested.

## HTML Rules

Choose elements by meaning before using generic containers:

- Use `<header>`, `<nav>`, `<main>`, `<section>`, `<article>`, `<aside>`, and `<footer>` for their corresponding page regions.
- Use `<h1>`–`<h6>`, `<p>`, `<ul>`/`<ol>`/`<li>`, `<figure>`/`<figcaption>`, `<address>`, `<time>`, and `<details>`/`<summary>` when the content has that meaning.
- Use `<form>`, `<fieldset>`, `<legend>`, and `<label>` for form groups; actual `<button>` elements for actions; and native fields with appropriate types.
- Use `<table>`, `<caption>`, `<thead>`, `<tbody>`, `<tr>`, `<th>`, and `<td>` only for tabular data.
- Do not default every container to `<div>`. Use `<div>` only when no semantic HTML element describes the content or layout group.

### Allowed modern HTML elements

Choose from these standard elements according to their semantics:

- **Document and metadata:** `<html>`, `<head>`, `<body>`, `<title>`, `<base>`, `<link>`, `<meta>`, `<style>`
- **Page regions:** `<header>`, `<nav>`, `<main>`, `<search>`, `<section>`, `<article>`, `<aside>`, `<footer>`, `<address>`
- **Headings:** `<h1>`–`<h6>`, `<hgroup>`
- **Content grouping:** `<p>`, `<hr>`, `<pre>`, `<blockquote>`, `<ol>`, `<ul>`, `<menu>`, `<li>`, `<dl>`, `<dt>`, `<dd>`, `<figure>`, `<figcaption>`, `<div>`
- **Inline text:** `<a>`, `<abbr>`, `<b>`, `<bdi>`, `<bdo>`, `<br>`, `<cite>`, `<code>`, `<data>`, `<dfn>`, `<em>`, `<i>`, `<kbd>`, `<mark>`, `<q>`, `<ruby>`, `<rp>`, `<rt>`, `<s>`, `<samp>`, `<small>`, `<span>`, `<strong>`, `<sub>`, `<sup>`, `<time>`, `<u>`, `<var>`, `<wbr>`
- **Edits:** `<del>`, `<ins>`
- **Images and media:** `<img>`, `<picture>`, `<source>`, `<audio>`, `<video>`, `<track>`, `<map>`, `<area>`
- **Embedded content:** `<iframe>`, `<embed>`, `<object>`, `<canvas>`; use only when the reference requires embedded or scripted content
- **Tables:** `<table>`, `<caption>`, `<colgroup>`, `<col>`, `<thead>`, `<tbody>`, `<tfoot>`, `<tr>`, `<th>`, `<td>`
- **Forms:** `<form>`, `<label>`, `<input>`, `<button>`, `<select>`, `<datalist>`, `<optgroup>`, `<option>`, `<textarea>`, `<fieldset>`, `<legend>`, `<output>`, `<progress>`, `<meter>`
- **Interactive elements:** `<details>`, `<summary>`, `<dialog>`
- **Templates and scripts:** `<template>`, `<slot>`, `<script>`, `<noscript>`

### Input types

Always choose the native input type matching the data instead of recreating it with generic elements or JavaScript:

- Text and identifiers: `text`, `search`, `email`, `tel`, `url`, `password`
- Numbers and ranges: `number`, `range`
- Dates and times: `date`, `time`, `datetime-local`, `month`, `week`
- Choices: `checkbox`, `radio`, `color`
- Files and images: `file`, `image`
- Form actions: `button`, `submit`, `reset`
- Internal values: `hidden`

Examples:

```html
<input type="date" name="startDate">
<input type="datetime-local" name="scheduledAt">
<input type="email" name="email" autocomplete="email">
<input type="number" name="quantity" min="0" step="1">
<input type="file" name="media" accept="image/*,video/*">
```

Do not use obsolete elements such as `<font>`, `<center>`, `<marquee>`, `<frameset>`, `<frame>`, `<big>`, `<strike>`, or `<tt>`.

Never use a `<div>`, `<span>`, or `<a href="#">` as a fake button, input, dropdown, checkbox, or toggle.

## CSS Rules

Organize CSS by page section or component. Use flexbox or grid where appropriate, use full available width by default, and avoid primary-container `max-width` limits unless the reference requires them. Use absolute positioning and media queries only where they improve fidelity.

- **MUST:** Use Nunito as the default font unless the supplied HTML, CSS, design spec, or reference clearly specifies another font.
- Do not use, install, run, or inspect Playwright.

## Assets and Icons

Use asset paths from the design spec when available. For a company logo, judge the reference and use `ncompasstv-logo` for N-Compass TV or `ntv360-logo` for NTV360 from [`icons/icons-sprite.svg`](icons/icons-sprite.svg); use `ncompass-cursor` only when the reference shows the N-Compass cursor mark. For other icons, first use matching files from `svg_path`, then `./icons/icons-sprite.svg`. If no suitable icon exists, define and create a faithful SVG file under `svg_path` and use it. **MUST NOT:** Use text characters or emoji as visual symbols; use an SVG icon instead. Do not hotlink arbitrary assets.

## Formatting and Syntax Validation

- Never minify or compress generated HTML or CSS. Use readable indentation, line breaks, and one CSS declaration per line so malformed tags, selectors, braces, and declarations are visible.
- Write `index.html` and `styles.css` with consistent readable formatting. Do not use, install, check, or run Prettier or another formatter.

## Quality Gate

Before completing, verify that both files are formatted, complete, linked, and runnable by opening `index.html`; the UI is faithful, responsive, accessible, and contains every required static control; no required section is empty; and the browser console has no HTML, CSS, or missing-asset errors.

## Final Response

After generating `index.html` and `styles.css`, do not make further edits or checks. Reply only:

```txt
done
```

On failure, reply only:

```txt
Cannot generate HTML because:
- <specific issue>
```
