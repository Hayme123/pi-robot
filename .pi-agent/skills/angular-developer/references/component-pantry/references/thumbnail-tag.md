---
tags:
  - component-docs
  - ntv360
  - component-pantry
  - thumbnail-tag
---

# Component: Thumbnail Tag

Read this file after selecting it from the component index. It is optimized for quick component lookup and implementation support.

## Summary
- Tag: `ntv-tag`
- Slug: `thumbnail-tag`
- Package: `@ntv360/component-pantry`
- Source: `component-pantry/thumbnail-tag/thumbnail-tag.manifest.ts`
- Playground controls: 6
- Properties: 9
- Demos: 5

## Description
A small color-coded label/badge for tagging media type or category (e.g. Documentary, Video, Feed). Used standalone or layered on top of `ntv-thumbnail-preview` / `ntv-thumbnail-item`.

## Variant colors

Defaults from the exported `THUMBNAIL_TAG_VARIANTS` map in `@ntv360/component-pantry@0.7.1`:

| Variant | Background | Text |
| --- | --- | --- |
| `documentary` / `image` | `#eef4fe` | `#0854e3` |
| `entertainment` | `#f4f3fa` | `#6152b8` |
| `education` | `#eef7df` | `#4a6b17` |
| `nature` | `#fff1e9` | `#ac3c00` |
| `technology` | `#e9f6f5` | `#196d65` |
| `lifestyle` | `#f9f1f7` | `#a53383` |
| `fashion` | `#fdf1f1` | `#b82a2a` |
| `animal` | `#fff2db` | `#875700` |
| `video` | `#fdf1f1` | `#e73535` |
| `feed` | `#e9f6f5` | `#26a69a` |
| `channel` | `#fff2db` | `#ffa500` |
| `filler` | `#feebc8` | `#c05621` |
| `default` | `#f3f3f5` | `#586176` |
| `custom` | `backgroundColor` | `textColor` |

## Features
- 14 preset color variants (documentary, entertainment, education, nature, technology, lifestyle, fashion, animal, image, video, feed, channel, filler, default) plus `custom` for arbitrary colors
- 5 size presets: `xs`, `sm`, `md`, `lg`, `full`
- 5 border-radius options: `xs`, `sm`, `md`, `lg`, `full`
- Label defaults to the capitalized variant name when not explicitly provided
- DRY `config` object pattern; individual inputs kept for backward compatibility
- Note: component selector is `ntv-tag`, not `ntv-thumbnail-tag` — does not follow the standard `ntv-{slug}` naming pattern.

## Playground Controls
| Control | Type | Default | Label | Description | Options | Content |
| --- | --- | --- | --- | --- | --- | --- |
| `label` | `text` | `` | Label | Display text. Defaults to the capitalized variant name when empty. |  | no |
| `variant` | `select` | `documentary` | Variant | Color preset | documentary, entertainment, education, nature, technology, lifestyle, fashion, animal, image, video, feed, channel, filler, default, custom | no |
| `size` | `select` | `md` | Size | Tag size | xs, sm, md, lg, full | no |
| `borderRadius` | `select` | `full` | Border Radius | Border radius preset | xs, sm, md, lg, full | no |
| `textColor` | `color` | `` | Text Color | Custom text color, used when variant is 'custom' |  | no |
| `backgroundColor` | `color` | `` | Background Color | Custom background color, used when variant is 'custom' |  | no |

## Properties
| Property | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `label` | `string` | no | `''` | The text label displayed in the tag. If not provided, defaults to the variant name. |
| `config` | `ThumbnailTagConfig` | no | `undefined` | DRY config object: { variant, size, maxWidth, textColor, backgroundColor, borderRadius }. Merges with individual inputs. |
| `variant` | `ThumbnailTagVariant` | no | `'documentary'` | Predefined color variant (documentary, entertainment, education, nature, technology, lifestyle, fashion, animal, image, video, feed, channel, filler, default, custom) |
| `maxWidth` | `string` | no | `''` | Max width of the tag (CSS value) |
| `size` | `'xs'\|'sm'\|'md'\|'lg'\|'full'` | no | `'md'` | Tag size |
| `textColor` | `string` | no | `''` | Custom text color (hex or CSS color), used when variant is 'custom' |
| `backgroundColor` | `string` | no | `''` | Custom background color (hex or CSS color), used when variant is 'custom' |
| `borderRadius` | `'xs'\|'sm'\|'md'\|'lg'\|'full'` | no | `'full'` | Border radius size |
| `tagClick` | `EventEmitter<ThumbnailTagClickEvent>` | no | `N/A` | Emits { label, variant, event } when the tag is clicked |

## Demos
### 1. Basic Usage

- Category: Usage
- Component type: universal
- Layout: horizontal
- Gap: 0.75rem
- Component tag: ntv-tag

A single tag with a preset variant

#### Instance 1: Documentary

- Label: Documentary

Config entries:
- `label`: `Documentary`
- `variant`: `documentary`

Code example:

```html
<ntv-tag label="Documentary" variant="documentary" />
```

### 2. All Preset Variants

- Category: Examples
- Component type: universal
- Layout: horizontal
- Gap: 0.5rem
- Component tag: ntv-tag

Every built-in color variant

#### Instance 1: Documentary

- Label: Documentary

Config entries:
- `label`: `Documentary`
- `variant`: `documentary`

#### Instance 2: Entertainment

- Label: Entertainment

Config entries:
- `label`: `Entertainment`
- `variant`: `entertainment`

#### Instance 3: Education

- Label: Education

Config entries:
- `label`: `Education`
- `variant`: `education`

#### Instance 4: Nature

- Label: Nature

Config entries:
- `label`: `Nature`
- `variant`: `nature`

#### Instance 5: Video

- Label: Video

Config entries:
- `label`: `Video`
- `variant`: `video`

#### Instance 6: Feed

- Label: Feed

Config entries:
- `label`: `Feed`
- `variant`: `feed`

### 3. Sizes

- Category: Examples
- Component type: universal
- Layout: horizontal
- Gap: 0.5rem
- Component tag: ntv-tag

All size presets

#### Instance 1: xs

- Label: xs

Config entries:
- `label`: `Live`
- `variant`: `video`
- `size`: `xs`

#### Instance 2: sm

- Label: sm

Config entries:
- `label`: `Live`
- `variant`: `video`
- `size`: `sm`

#### Instance 3: md

- Label: md

Config entries:
- `label`: `Live`
- `variant`: `video`
- `size`: `md`

#### Instance 4: lg

- Label: lg

Config entries:
- `label`: `Live`
- `variant`: `video`
- `size`: `lg`

### 4. Custom Color

- Category: Configuration
- Component type: universal
- Layout: horizontal
- Gap: 0.75rem
- Component tag: ntv-tag

Arbitrary text/background colors via variant="custom"

#### Instance 1: Custom

- Label: Custom

Config entries:
- `label`: `Special`
- `variant`: `custom`
- `textColor`: `#ffffff`
- `backgroundColor`: `#6366f1`

Code example:

```html
<ntv-tag label="Special" variant="custom" textColor="#fff" backgroundColor="#6366f1" />
```

### 5. DRY Config Pattern

- Category: Configuration
- Component type: universal
- Layout: horizontal
- Gap: 0.75rem
- Component tag: ntv-tag

Using the config object

#### Instance 1: Config Object

- Label: Config Object

Config entries:
- `label`: `Video`
- `config`: `{"variant":"video","size":"md","borderRadius":"md"}`

Code example:

```html
tagConfig: ThumbnailTagConfig = { variant: 'video', size: 'md', borderRadius: 'md' };

<ntv-tag label="Video" [config]="tagConfig" />
```
