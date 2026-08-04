---
tags:
  - component-docs
  - ntv360
  - component-pantry
  - error-states
---

# Component: Error States

Read this file after selecting it from the component index. It is optimized for quick component lookup and implementation support.

## Summary
- Tag: `ntv-error-states`
- Slug: `error-states`
- Package: `@ntv360/component-pantry`
- Source: `component-pantry/error-states/error-states.manifest.ts`
- Playground controls: 3
- Properties: 16
- Demos: 5

## Description
Full-screen or card-style error pages for common HTTP error codes (404, 500, 403, and 4xx/5xx card variants).

## Features
- 3 layouts: `fullscreen` (`404`, `500`, `403`), `5xx-card` (`500-card`, `502-card`, `503-card`, `504-card`), `4xx-card` (`403-card`, `401-card`, `400-card`)
- Built-in illustrations and default title/message per variant
- Each action button supports two modes: path input (direct `window.location.href` navigation) or output event (handle yourself, e.g. Angular Router)
- Path input takes priority — the corresponding output is not emitted when a path is set
- Optional global route config via `provideErrorStatesRoutes` — register paths once, every instance picks them up
- Custom width/height overrides for card layouts
- DRY `config` object pattern (overrides `variant`, `errorTitle`, `errorMessage`)

## Playground Controls
| Control | Type | Default | Label | Description | Options | Content |
| --- | --- | --- | --- | --- | --- | --- |
| `variant` | `select` | `404` | Variant | HTTP error code variant to display | 404, 500, 403, 500-card, 502-card, 503-card, 504-card, 403-card, 401-card, 400-card | no |
| `errorTitle` | `text` | `` | Title Override | Overrides the default title for the active variant |  | no |
| `errorMessage` | `textarea` | `` | Message Override | Overrides the default message for the active variant |  | no |

## Properties
| Property | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `variant` | `'404'\|'500'\|'500-card'\|'502-card'\|'503-card'\|'504-card'\|'403'\|'403-card'\|'401-card'\|'400-card'` | no | `'404'` | Error variant to display. Determines layout, illustration, default title/message, and action buttons. |
| `config` | `ErrorStateConfig` | no | `undefined` | Full config object: { type, title, message }. Takes precedence over variant, errorTitle, and errorMessage. |
| `errorTitle` | `string` | no | `''` | Overrides the default title for the active variant |
| `errorMessage` | `string` | no | `''` | Overrides the default message for the active variant |
| `goHomePath` | `string` | no | `undefined` | URL/route for "Go Home". When set, navigates via window.location.href and goHome is not emitted. Overrides the global provideErrorStatesRoutes token. |
| `signInPath` | `string` | no | `undefined` | URL/route for "Sign In" (401-card only). When set, navigates directly and signIn is not emitted. |
| `requestAccessPath` | `string` | no | `undefined` | URL/route for "Request Access" (403, 403-card only). When set, navigates directly and requestAccess is not emitted. |
| `customWidth` | `string` | no | `undefined` | Custom card width (any CSS size value). Only affects card layouts (5xx-card, 4xx-card). |
| `customHeight` | `string` | no | `undefined` | Custom card min-height (any CSS size value). Only affects card layouts (5xx-card, 4xx-card). |
| `showBolts` | `boolean` | no | `true` | Whether to show the decorative corner bolts on the 5xx-card layout. |
| `showCaution` | `boolean` | no | `true` | Whether to show the decorative caution-tape stripes (top/bottom) on the 4xx-card layout. |
| `goHome` | `EventEmitter<void>` | no | `N/A` | Emitted when "Go Home" is clicked and no goHomePath (input or global token) is set |
| `goBack` | `EventEmitter<void>` | no | `N/A` | Emitted when "Go Back" is clicked. Always emitted — no path equivalent. |
| `retry` | `EventEmitter<void>` | no | `N/A` | Emitted when "Retry" is clicked. Always emitted — no path equivalent. |
| `signIn` | `EventEmitter<void>` | no | `N/A` | Emitted when "Sign In" is clicked (401-card) and no signInPath is set |
| `requestAccess` | `EventEmitter<void>` | no | `N/A` | Emitted when "Request Access" is clicked (403, 403-card) and no requestAccessPath is set |

## Demos
### 1. Fullscreen Variants

- Category: Examples
- Component type: universal
- Layout: vertical
- Gap: 1.5rem
- Component tag: ntv-error-states

404, 500, and 403 fullscreen error pages

#### Instance 1: 404 Not Found

- Label: 404 Not Found

Config entries:
- `variant`: `404`

Code example:

```html
<ntv-error-states variant="404" (goBack)="onGoBack()"></ntv-error-states>
```

#### Instance 2: 500 Server Error

- Label: 500 Server Error

Config entries:
- `variant`: `500`

Code example:

```html
<ntv-error-states variant="500" (retry)="onRetry()" (goBack)="onGoBack()"></ntv-error-states>
```

#### Instance 3: 403 Forbidden

- Label: 403 Forbidden

Config entries:
- `variant`: `403`

Code example:

```html
<ntv-error-states variant="403" (goBack)="onGoBack()" (requestAccess)="onRequestAccess()"></ntv-error-states>
```

### 2. 5xx Card Variants

- Category: Examples
- Component type: universal
- Layout: grid
- Gap: 1rem
- Component tag: ntv-error-states

Card-style server error states

#### Instance 1: 500 Card

- Label: 500 Card

Config entries:
- `variant`: `500-card`

#### Instance 2: 502 Bad Gateway

- Label: 502 Bad Gateway

Config entries:
- `variant`: `502-card`

#### Instance 3: 503 Unavailable

- Label: 503 Unavailable

Config entries:
- `variant`: `503-card`

#### Instance 4: 504 Timeout

- Label: 504 Timeout

Config entries:
- `variant`: `504-card`

### 3. 4xx Card Variants

- Category: Examples
- Component type: universal
- Layout: grid
- Gap: 1rem
- Component tag: ntv-error-states

Card-style client error states

#### Instance 1: 403 Forbidden

- Label: 403 Forbidden

Config entries:
- `variant`: `403-card`

#### Instance 2: 401 Unauthorized

- Label: 401 Unauthorized

Config entries:
- `variant`: `401-card`

#### Instance 3: 400 Bad Request

- Label: 400 Bad Request

Config entries:
- `variant`: `400-card`

### 4. Custom Title and Message

- Category: Configuration
- Component type: universal
- Layout: horizontal
- Gap: 1rem
- Component tag: ntv-error-states

Override the default copy without replacing the full config

#### Instance 1: Scheduled Maintenance

- Label: Scheduled Maintenance

Config entries:
- `variant`: `503-card`
- `errorTitle`: `Scheduled Maintenance`
- `errorMessage`: `We'll be back online at 08:00 UTC.`

Code example:

```html
<ntv-error-states
  variant="503-card"
  errorTitle="Scheduled Maintenance"
  errorMessage="We'll be back online at 08:00 UTC."
  (retry)="onRetry()">
</ntv-error-states>
```

### 5. Custom Card Size

- Category: Configuration
- Component type: universal
- Layout: horizontal
- Gap: 1rem
- Component tag: ntv-error-states

Override card width/height (card layouts only)

#### Instance 1: Custom Size

- Label: Custom Size

Config entries:
- `variant`: `500-card`
- `customWidth`: `900px`
- `customHeight`: `500px`

Code example:

```html
<ntv-error-states variant="500-card" [customWidth]="'900px'" [customHeight]="'500px'" (retry)="onRetry()"></ntv-error-states>
```
