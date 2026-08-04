---
tags:
  - component-docs
  - ntv360
  - component-pantry
  - video-preview
---

# Component: Video Preview

Read this file after selecting it from the component index. It is optimized for quick component lookup and implementation support.

## Summary
- Tag: `ntv-video-preview`
- Slug: `video-preview`
- Package: `@ntv360/component-pantry`
- Source: `component-pantry/video-preview/video-preview.manifest.ts`
- Playground controls: 2
- Properties: 5
- Demos: 4

## Description
A self-contained video player panel with play/pause, scrubber, expand-to-fullscreen, and loading/empty states.

## Features
- 5 size presets (`xs` 320x180, `sm` 480x270, `md` 640x360, `lg` 960x540, `xl` 1280x720) plus a `custom` size with explicit width/height
- Built-in Lottie loading animation while buffering
- Empty/error placeholder shown when `src` is empty or playback fails
- Click-to-expand toggles the panel to fill the viewport
- Scrubber synced to playback via requestAnimationFrame
- Hover-based autoplay is intentionally suppressed — playback always starts via explicit user click

## Playground Controls
| Control | Type | Default | Label | Description | Options | Content |
| --- | --- | --- | --- | --- | --- | --- |
| `size` | `select` | `md` | Size | Preset panel size, or custom for explicit width/height | xs, sm, md, lg, xl, custom | no |
| `src` | `text` | `` | Source URL | Video source URL. Empty shows the placeholder state. |  | no |

## Properties
| Property | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `size` | `'xs'\|'sm'\|'md'\|'lg'\|'xl'\|'custom'` | no | `'md'` | Panel size preset. xs=320×180 \| sm=480×270 \| md=640×360 \| lg=960×540 \| xl=1280×720 \| custom=explicit width/height |
| `src` | `string` | no | `''` | Source URL for the preview video. Empty values show the placeholder/empty state. |
| `showVideoTag` | `boolean` | no | `true` | Whether to render the underlying <video> tag |
| `customPanelHeight` | `string` | no | `''` | Custom panel height (CSS value), used when size is 'custom'. Falls back to 480px. |
| `customPanelWidth` | `string` | no | `''` | Custom panel width (CSS value), used when size is 'custom'. Falls back to 640px. |

## Demos
### 1. Basic Usage

- Category: Usage
- Component type: universal
- Layout: horizontal
- Gap: 1.5rem
- Component tag: ntv-video-preview

A video preview panel with a source URL

#### Instance 1: Default

- Label: Default

Config entries:
- `src`: `https://www.w3schools.com/html/mov_bbb.mp4`

Code example:

```html
<ntv-video-preview src="https://cdn.example.com/video.mp4" />
```

### 2. Size Presets

- Category: Examples
- Component type: universal
- Layout: vertical
- Gap: 1rem
- Component tag: ntv-video-preview

All built-in size presets

#### Instance 1: xs

- Label: xs

Config entries:
- `src`: `https://www.w3schools.com/html/mov_bbb.mp4`
- `size`: `xs`

#### Instance 2: sm

- Label: sm

Config entries:
- `src`: `https://www.w3schools.com/html/mov_bbb.mp4`
- `size`: `sm`

#### Instance 3: md

- Label: md

Config entries:
- `src`: `https://www.w3schools.com/html/mov_bbb.mp4`
- `size`: `md`

### 3. Custom Dimensions

- Category: Configuration
- Component type: universal
- Layout: horizontal
- Gap: 1rem
- Component tag: ntv-video-preview

Explicit width/height overrides

#### Instance 1: Custom

- Label: Custom

Config entries:
- `src`: `https://www.w3schools.com/html/mov_bbb.mp4`
- `size`: `custom`
- `customPanelWidth`: `480px`
- `customPanelHeight`: `270px`

Code example:

```html
<ntv-video-preview src="/assets/sample.mp4" size="custom" customPanelWidth="480px" customPanelHeight="270px" />
```

### 4. Placeholder State

- Category: Examples
- Component type: universal
- Layout: horizontal
- Gap: 1rem
- Component tag: ntv-video-preview

Shown when src is empty or fails to load

#### Instance 1: No Source

- Label: No Source

Config entries:
- `src`: ``
