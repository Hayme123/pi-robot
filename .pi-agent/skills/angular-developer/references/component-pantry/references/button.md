---
tags:
  - component-docs
  - ntv360
  - component-pantry
  - button
---

# Component: Button

Read this file after selecting it from the component index. It is optimized for quick component lookup and implementation support.

## Summary
- Tag: `ntv-button`
- Slug: `button`
- Package: `@ntv360/component-pantry`
- Source: `component-pantry/button/button.manifest.ts`
- Playground controls: 11
- Properties: 23
- Demos: 7

## Description
A versatile button component with multiple variants, sizes, and states.

## Required gradient usage
- When the reference shows a gradient button, use `variant="primary"`; the primary variant provides the supported brand gradient.
- Do not select `variant="gradient"` to reproduce a gradient design.

```html
<ntv-button variant="primary">Continue</ntv-button>
```

## Variant colors

Defaults from `@ntv360/component-pantry@0.7.1`. The primary resting color is the supported brand gradient described above.

| Variant | Resting background | Text/border | Hover | Active/focus |
| --- | --- | --- | --- | --- |
| `primary` | `linear-gradient(90deg, #c41e5c, #e8342a 60%, #ff6b00)`; fallback `#091635` | `#ffffff` | `linear-gradient(90deg, #a00558, #ef060f, #f18029)` | active removes the gradient, revealing `#091635`; focus ring `#777f90` |
| `secondary` | `#ffffff` | `#d10334` text and border | `#ffc28d` with `#ffffff` text | `#03235d` with `#ffffff` text; focus ring `#d10334` |
| `success` | `#3adb30` | `#ffffff` | `#6ee466` | focus ring `#279220` |
| `warning` | `#ffa500` | `#ffffff` | `#ffc150` | focus ring `#ffa500` |
| `danger` | transparent | `#d10334` text and border | `#fff3ea` with `#d10334` text | `#e73535` with `#ffffff` text |
| `accent` | `#d10334` | `#ffffff` | `#ff8500` | focus ring `#d10334` |
| `description` | `#6b7280` | `#ffffff` | `#4b5563` | focus ring `#9ca3af` |
| `info` | `#095af3` | `#ffffff` | `#0854e3` | focus ring `#095af3` |
| `ghost` | `#f3f3f5` | `#c9ccd2` | unchanged | no variant-specific focus color |
| `outline` | transparent | inherited text; `#e5e7eb` default border | `hoverColor` supplies background, border, and text | no built-in hover fallback |
| `fill-to-outline` | `var(--button-color)` | `#ffffff` | white fill with `var(--button-color)` border/text gradient | requires a custom color/gradient |
| `outline-to-fill` | white fill with `var(--button-color)` border/text gradient | gradient text | `var(--button-color)` fill with `#ffffff` text | requires a custom color/gradient |
| `gradient` | `var(--button-color)` | `#ffffff` | unchanged | requires a custom gradient |
| `split` | transparent | `#111827`; separator fallback `#d1d5db` | `var(--hover-color, var(--button-color, #ffe2cc))` | no variant-specific active color |

Focus-ring values apply only when `noFocusRing=false`; its default is `true`. `primary`, `secondary`, `success`, `warning`, `danger`, `accent`, `description`, and `info` disabled states use the component's general 50% opacity. `primary` instead resolves to `#e5e7eb` with `#5b6478` text at full opacity; `secondary` resolves to `#e6e7ea` with `#c9ccd2` text at full opacity.

### Named `color` overrides

A named `color` adds another button class and overrides the variant fill.

| `color` | Resting | Hover | Focus ring | Text |
| --- | --- | --- | --- | --- |
| `blue` | `#2563eb` | `#1d4ed8` | `#3b82f6` | `#ffffff` |
| `green` | `#16a34a` | `#15803d` | `#22c55e` | `#ffffff` |
| `red` | `#cf040b` | `#a30307` | `#ef060f` | `#ffffff` |
| `yellow` | `#ca8a04` | `#a16207` | `#eab308` | `#ffffff` |
| `purple` | `#6152b8` | `#412faa` | `#8073c6` | `#ffffff` |
| `gray` | `#4b5563` | `#374151` | `#6b7280` | `#ffffff` |
| `indigo` | `#4f46e5` | `#4338ca` | `#6366f1` | `#ffffff` |
| `pink` | `#db2777` | `#be185d` | `#ec4899` | `#ffffff` |

### FAB color differences

`fab` and `fabRoundedFull` use solid fills rather than the standard primary gradient. Their main resting/hover/active colors are:

| Variant | Resting | Hover | Active |
| --- | --- | --- | --- |
| `primary` | `#091635` | `#3b455e` | `#3b455e` |
| `secondary` | `#4b5563` | `#374151` | `#1f2937` |
| `success` | `#3adb30` | `#6ee466` | `#0c2d0a` |
| `warning` | `#ffa500` | `#ffc150` | `#362300` |
| `danger` | `#ef4444` | `#dc2626` | `#b91c1c` |
| `accent` | `#d10334` | `#ff8500` | `#d10334` |
| `info` | `#095af3` | `#0854e3` | `#03235d` |
| `description` | `#6b7280` | `#4b5563` | `#4b5563` |

`fabInteractive` uses the same resting and hover fills. Although its base active selector declares `#1f2937`, the later variant selectors win in the resolved cascade: pointer-active keeps the variant hover fill, while `[active]` keeps the resting fill. FAB disabled fill/text are `#e5e7eb`/`#9ca3af`.

### Custom color behavior

- `primary` sets `--btn-bg`, `--btn-border`, and contrast-aware `--btn-text`; with `gradient=true`, a solid hex becomes a three-stop gradient using the color darkened/lightened by 18%.
- `outline` sets `--btn-outline-color`; `backgroundColor` sets `--btn-outline-bg`.
- `outline-to-fill`, `fill-to-outline`, and `gradient` set `--button-color`.
- `ghost` sets `--btn-bg` and contrast-aware `--btn-text`.
- `hoverColor` sets `--hover-color`.

## Playground Controls
| Control | Type | Default | Label | Description | Options | Content |
| --- | --- | --- | --- | --- | --- | --- |
| `variant` | `select` | `primary` | Variant | Visual style variant of the button | primary, secondary, success, warning, danger, outline, accent, description, info, ghost, outline-to-fill, gradient, fill-to-outline, split | no |
| `size` | `select` | `md` | Size | Size of the button | xs, sm, md, lg, xl, xxl | no |
| `color` | `select` | `` | Color | Color of the button - overrides variant color | , blue, green, red, yellow, purple, gray, indigo, pink, custom | no |
| `customColor` | `color` | `#3b82f6` | Custom Color | Custom hex color when color is "custom" |  | no |
| `disabled` | `boolean` | `false` | Disabled | Whether the button is disabled |  | no |
| `loading` | `boolean` | `false` | Loading | Whether the button is in loading state |  | no |
| `fullWidth` | `boolean` | `false` | Full Width | Whether the button should take full width |  | no |
| `rounded` | `select` | `md` | Rounded | Border radius style | none, sm, md, lg, xl, full | no |
| `shadow` | `boolean` | `true` | Shadow | Whether the button has shadow |  | no |
| `type` | `select` | `button` | Type | Button HTML type attribute | button, submit, reset, fab, fabRoundedFull, fabInteractive | no |
| `label` | `text` | `Click me` | Label | Button text content |  | yes |

## Properties
| Property | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `variant` | `'primary' \| 'secondary' \| 'success' \| 'warning' \| 'danger' \| 'outline' \| 'accent' \| 'description' \| 'info' \| 'ghost' \| 'outline-to-fill' \| 'gradient' \| 'fill-to-outline' \| 'split'` | no | `'primary'` | Visual style variant of the button |
| `size` | `'xs' \| 'sm' \| 'md' \| 'lg' \| 'xl' \| 'xxl'` | no | `'md'` | Size of the button |
| `color` | `'blue' \| 'green' \| 'red' \| 'yellow' \| 'purple' \| 'gray' \| 'indigo' \| 'pink' \| 'custom' \| ''` | no | `''` | Color of the button - only used when you want a specific color independent of variant |
| `customColor` | `string` | no | `''` | Custom hex color when color is "custom" |
| `disabled` | `boolean` | no | `false` | Whether the button is disabled |
| `loading` | `boolean` | no | `false` | Whether the button is in loading state |
| `active` | `boolean` | no | `false` | Pins the button in its active-state appearance. |
| `gradient` | `boolean` | no | `true` | For variant="primary" and color="custom", controls whether the custom color renders as a gradient. |
| `fullWidth` | `boolean` | no | `false` | Whether the button should take full width |
| `rounded` | `'none' \| 'sm' \| 'md' \| 'lg' \| 'xl' \| 'full'` | no | `'md'` | Rounded corner style |
| `customRadius` | `string` | no | `''` | Explicit CSS corner radius that overrides the rounded preset. |
| `shadow` | `boolean` | no | `true` | Whether the button has shadow |
| `type` | `'button' \| 'submit' \| 'reset' \| 'fab' \| 'fabRoundedFull' \| 'fabInteractive'` | no | `'button'` | Button type attribute |
| `fontSize` | `string` | no | `'14px'` | Font size for button text |
| `contentAlignment` | `'center' \| 'start' \| 'between'` | no | `'center'` | Content alignment inside the button |
| `innerContentAlignment` | `'center' \| 'start' \| 'end' \| 'between'` | no | `'center'` | Inner content alignment for ng-content wrapper |
| `customHeight` | `string` | no | `''` | Custom height of the button |
| `noFocusRing` | `boolean` | no | `true` | Whether to remove focus ring styles |
| `hoverColor` | `string` | no | `''` | Custom hover color for the button |
| `backgroundColor` | `string` | no | `''` | Custom background color for the button |
| `config` | `ButtonConfig` | no | `undefined` | Configuration object for DRY pattern - merges with individual properties |
| `showSplitOptions` | `boolean` | no | `false` | Whether to show split button options |
| `buttonClick` | `EventEmitter<Event>` | no | `N/A` | Event emitted when button is clicked (not emitted when disabled or loading) |

## Demos
### 1. Button Variants

- Category: Examples
- Component type: universal
- Layout: horizontal
- Gap: N/A
- Component tag: ntv-button

Different visual styles for various use cases

#### Instance 1: Primary

- Label: Primary
- Variant: primary

Content:

```html
Primary
```

#### Instance 2: Secondary

- Label: Secondary
- Variant: secondary

Content:

```html
Secondary
```

#### Instance 3: Success

- Label: Success
- Variant: success

Content:

```html
Success
```

#### Instance 4: Warning

- Label: Warning
- Variant: warning

Content:

```html
Warning
```

#### Instance 5: Danger

- Label: Danger
- Variant: danger

Content:

```html
Danger
```

#### Instance 6: Outline

- Label: Outline
- Variant: outline

Content:

```html
Outline
```

#### Instance 7: Accent

- Label: Accent
- Variant: accent

Content:

```html
Accent
```

#### Instance 8: Info

- Label: Info
- Variant: info

Content:

```html
Info
```

#### Instance 9: Ghost

- Label: Ghost
- Variant: ghost

Content:

```html
Ghost
```

#### Instance 10: Brand Gradient

- Label: Brand Gradient
- Variant: primary

Content:

```html
Brand Gradient
```

#### Instance 11: Outline to Fill

- Label: Outline to Fill
- Variant: outline-to-fill

Content:

```html
Outline to Fill
```

#### Instance 12: Fill to Outline

- Label: Fill to Outline
- Variant: fill-to-outline

Content:

```html
Fill to Outline
```

### 2. Button Sizes

- Category: Examples
- Component type: universal
- Layout: horizontal
- Gap: N/A
- Component tag: ntv-button

Different size options from extra small to extra extra large

#### Instance 1: Extra Small

- Label: Extra Small
- Size: xs
- Variant: primary

Content:

```html
XS
```

#### Instance 2: Small

- Label: Small
- Size: sm
- Variant: primary

Content:

```html
Small
```

#### Instance 3: Medium

- Label: Medium
- Size: md
- Variant: primary

Content:

```html
Medium
```

#### Instance 4: Large

- Label: Large
- Size: lg
- Variant: primary

Content:

```html
Large
```

#### Instance 5: Extra Large

- Label: Extra Large
- Size: xl
- Variant: primary

Content:

```html
XL
```

#### Instance 6: Extra Extra Large

- Label: Extra Extra Large
- Size: xxl
- Variant: primary

Content:

```html
XXL
```

### 3. Button States

- Category: Examples
- Component type: universal
- Layout: horizontal
- Gap: N/A
- Component tag: ntv-button

Disabled and loading states with proper accessibility

#### Instance 1: Normal

- Label: Normal
- Variant: primary

Content:

```html
Click me
```

#### Instance 2: Disabled

- Label: Disabled
- Variant: primary
- Disabled: true

Content:

```html
Disabled
```

#### Instance 3: Loading

- Label: Loading
- Variant: primary
- Loading: true

Content:

```html
Loading...
```

### 4. Custom Colors

- Category: Examples
- Component type: universal
- Layout: horizontal
- Gap: N/A
- Component tag: ntv-button

Use predefined colors or custom hex values

#### Instance 1: Blue

- Label: Blue

Props:
- `color`: `blue`

Content:

```html
Blue
```

#### Instance 2: Green

- Label: Green

Props:
- `color`: `green`

Content:

```html
Green
```

#### Instance 3: Red

- Label: Red

Props:
- `color`: `red`

Content:

```html
Red
```

#### Instance 4: Custom

- Label: Custom

Props:
- `color`: `custom`
- `customColor`: `#ff6b35`

Content:

```html
Custom
```

### 5. Layout Options

- Category: Configuration
- Component type: universal
- Layout: vertical
- Gap: N/A
- Component tag: ntv-button

Full width and rounded corner variations

#### Instance 1: Full Width

- Label: Full Width
- Variant: primary

Props:
- `fullWidth`: `true`

Content:

```html
Full Width Button
```

#### Instance 2: Sharp Corners

- Label: Sharp Corners
- Variant: secondary

Props:
- `rounded`: `none`

Content:

```html
Sharp
```

#### Instance 3: Fully Rounded

- Label: Fully Rounded
- Variant: success

Props:
- `rounded`: `full`

Content:

```html
Rounded
```

### 6. Basic Usage

- Category: Usage
- Component type: universal
- Layout: vertical
- Gap: N/A
- Component tag: ntv-button

Simple button implementation

#### Instance 1: Basic Button

- Label: Basic Button
- Variant: primary

Content:

```html
Click me
```

Code example:

```html
<ntv-button variant="primary">Click me</ntv-button>
```

#### Instance 2: With Event Handler

- Label: With Event Handler
- Variant: secondary

Content:

```html
Submit
```

Code example:

```html
<ntv-button variant="secondary" (buttonClick)="handleClick($event)">Submit</ntv-button>
```

### 7. Config Pattern

- Category: Examples
- Component type: universal
- Layout: vertical
- Gap: N/A
- Component tag: ntv-button

Using the DRY config object pattern

#### Instance 1: Config Object

- Label: Config Object
- Variant: primary
- Size: lg

Props:
- `shadow`: `true`

Content:

```html
Save Changes
```

Code example:

```html
// Component
buttonConfig = {
  variant: 'primary',
  size: 'lg',
  shadow: true
};

// Template
<ntv-button [config]="buttonConfig">Save Changes</ntv-button>
```
