---
tags:
  - component-docs
  - ntv360
  - component-pantry
  - thumbnail-item
---

# Component: Thumbnail Item

Read this file after selecting it from the component index. It is optimized for quick component lookup and implementation support.

## Summary
- Tag: `ntv-thumbnail-item`
- Slug: `thumbnail-item`
- Package: `@ntv360/component-pantry`
- Source: `component-pantry/thumbnail-item/thumbnail-item.manifest.ts`
- Playground controls: 8
- Properties: 53
- Demos: 4

## Description
A single media card showing a thumbnail (image, video, document, audio, folder, archive, code, feed, or filler) with selection, hover video playback, action buttons, and a right-click context menu. Used standalone or as the per-item renderer inside `ntv-thumbnail-gallery`.

## Features
- Grid or list layout; `sm`/`md`/`lg`/`xl` plus `channel-*` size presets
- 4 visual variants: `default`, `bordered`, `shadow`, `rounded` (plus `channel`)
- Hover-triggered video playback with auto-generated thumbnail (canvas frame capture) when no thumbnail is provided
- Selection mode with checkbox, two-way `selected` model
- Favorite, edit, delete action buttons (each two-way/model where applicable)
- Right-click context menu with submenu support (suppressed automatically when used inside a gallery)
- Info tag overlay (type badge) with customizable text/colors/border-radius, duration badge
- Customizable width/height/text size via CSS overrides

## Playground Controls
| Control | Type | Default | Label | Description | Options | Content |
| --- | --- | --- | --- | --- | --- | --- |
| `size` | `select` | `md` | Size | Size preset | sm, md, lg, xl, channel-sm, channel-md, channel-lg, channel-xl | no |
| `variant` | `select` | `default` | Variant | Visual style applied to the card | default, bordered, shadow, rounded, channel | no |
| `layout` | `select` | `grid` | Layout | Display orientation | grid, list | no |
| `selectable` | `boolean` | `false` | Selectable | Enable the selection checkbox / click-to-select behavior |  | no |
| `showLabels` | `boolean` | `true` | Show Labels | Whether to show the file name label |  | no |
| `showThumbnailTag` | `boolean` | `true` | Show Type Tag | Whether to show the type tag badge (uses ntv-thumbnail-tag) |  | no |
| `hoverEffects` | `boolean` | `true` | Hover Effects | Whether to apply hover scale/shadow effects |  | no |
| `showActionButtons` | `boolean` | `true` | Action Buttons | Whether to show edit/delete/favorite action buttons |  | no |

## Properties
| Property | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `item` | `ThumbnailItem` | yes | `required` | The thumbnail item data to display: { id, name, type, src?, url?, thumbnail?, size?, modified?, duration?, metadata?, favorited?, ... } |
| `selectedIds` | `Set<string>` | no | `new Set()` | Set of selected item IDs, used to derive the selected state when not driving selected directly |
| `index` | `number` | no | `0` | Index of the item, included in emitted click/selection events |
| `size` | `'sm'\|'md'\|'lg'\|'xl'\|'channel-sm'\|'channel-md'\|'channel-lg'\|'channel-xl'` | no | `'md'` | Size preset |
| `variant` | `'default'\|'bordered'\|'shadow'\|'rounded'\|'channel'` | no | `'default'` | Visual style of the card |
| `layout` | `'grid'\|'list'` | no | `'grid'` | Display orientation |
| `selectable` | `boolean` | no | `false` | Whether the item can be selected |
| `showLabels` | `boolean` | no | `true` | Whether to show the file name label |
| `showThumbnailTag` | `boolean` | no | `true` | Whether to show the type tag badge |
| `showMetadata` | `boolean` | no | `false` | Whether to show the metadata row |
| `showFileSize` | `boolean` | no | `false` | Whether to show the file size |
| `showModified` | `boolean` | no | `false` | Whether to show the last modified date |
| `hoverEffects` | `boolean` | no | `true` | Whether to apply hover scale/shadow effects |
| `clickable` | `boolean` | no | `true` | Whether the item responds to click events |
| `showActionButtons` | `boolean` | no | `true` | Whether to show action buttons on hover |
| `eyeIconVisible` | `boolean` | no | `true` | Whether the preview/eye icon is visible |
| `menuOptionVisible` | `boolean` | no | `false` | Whether the "more options" menu icon is visible in the name area |
| `showFavoriteIcon` | `boolean (two-way)` | no | `false` | Whether to show the favorite icon in the name area |
| `showEditButton` | `boolean (two-way)` | no | `false` | Whether to show the edit button |
| `showDeleteButton` | `boolean (two-way)` | no | `false` | Whether to show the delete button |
| `disableRightClick` | `boolean` | no | `false` | Whether to disable the right-click context menu |
| `showThumbnailInfoTag` | `boolean` | no | `true` | Whether to show the info tag overlay (overridden per-item by item.showThumbnailInfoTag) |
| `infoTagTextColor` | `string` | no | `''` | Custom text color for the info tag (overridden per-item by item.infoTagTextColor) |
| `infoTagBackgroundColor` | `string` | no | `''` | Custom background color for the info tag (overridden per-item by item.infoTagBackgroundColor) |
| `infoTagText` | `string` | no | `''` | Custom text for the info tag (overridden per-item by item.infoTagText) |
| `infoTagBorderRadius` | `'xs'\|'sm'\|'md'\|'lg'\|'full'` | no | `'md'` | Border radius for the info tag (overridden per-item by item.infoTagBorderRadius) |
| `infoTagVariant` | `ThumbnailTagVariant` | no | `DEFAULT_THUMBNAIL_CONFIG.infoTagVariant` | Color variant for the info tag (overridden per-item by item.infoTagVariant) |
| `infoTagMaxWidth` | `string` | no | `DEFAULT_THUMBNAIL_CONFIG.infoTagMaxWidth` | Max width for the info tag (overridden per-item by item.infoTagMaxWidth) |
| `showDuration` | `boolean` | no | `DEFAULT_THUMBNAIL_CONFIG.showDuration` | Whether to show the video/audio duration badge (overridden per-item by item.showDuration) |
| `showTotalMins` | `boolean` | no | `false` | Whether to show the total minutes stats row |
| `showTotalContents` | `boolean` | no | `false` | Whether to show the total contents stats row |
| `totalMins` | `string` | no | `''` | Total minutes to display (e.g. '34 mins'), overridden per-item by item.totalMins |
| `totalContents` | `string` | no | `''` | Total contents count to display (e.g. '13 Contents'), overridden per-item by item.totalContents |
| `customWidth` | `string` | no | `''` | Custom width override (CSS value) |
| `customHeight` | `string` | no | `''` | Custom height override (CSS value) |
| `customTextSize` | `string` | no | `''` | Custom text size override (e.g. '14px') |
| `selected` | `boolean (two-way)` | no | `false` | Selected state. Synced with selectedIds when both are used. |
| `activeContextMenuId` | `string \| null` | no | `null` | ID of the item whose context menu should remain open; closes this item's menu when it differs |
| `actions` | `ThumbnailAction[]` | no | `DEFAULT_THUMBNAIL_ACTIONS` | Overrides the default context-menu action list |
| `isInsideGallery` | `boolean` | no | `false` | Set by ThumbnailGallery to suppress the internal context menu when the gallery renders its own |
| `suppressHoverPlayback` | `boolean` | no | `false` | Disables hover-triggered video playback |
| `itemClick` | `EventEmitter<ThumbnailClickEvent>` | no | `N/A` | Emits { item, index, event } on click when not in selectable mode |
| `selectionToggle` | `EventEmitter<ThumbnailItemSelectionEvent>` | no | `N/A` | Emits { item, event, source, selected, index } when selection is toggled |
| `contextMenuRequest` | `EventEmitter<{ item, event }>` | no | `N/A` | Emits when a context menu is requested (right-click or "more options") |
| `mouseEnter` | `EventEmitter<ThumbnailItem>` | no | `N/A` | Emits the item when the mouse enters |
| `mouseLeave` | `EventEmitter<void>` | no | `N/A` | Emits when the mouse leaves |
| `favoriteClick` | `EventEmitter<ThumbnailItem>` | no | `N/A` | Emits when the favorite button is clicked |
| `editClick` | `EventEmitter<ThumbnailItem>` | no | `N/A` | Emits when the edit button (or context menu edit action) is clicked |
| `deleteClick` | `EventEmitter<ThumbnailItem>` | no | `N/A` | Emits when the delete button (or context menu delete action) is clicked |
| `nameClick` | `EventEmitter<ThumbnailItem>` | no | `N/A` | Emits when the name label is clicked |
| `viewClick` | `EventEmitter<ThumbnailItem>` | no | `N/A` | Emits when the eye/preview button is clicked |
| `copyClick` | `EventEmitter<ThumbnailItem>` | no | `N/A` | Emits when the context menu copy action is triggered |
| `downloadClick` | `EventEmitter<ThumbnailItem>` | no | `N/A` | Emits when the context menu download action is triggered |

## Demos
### 1. Basic Usage

- Category: Usage
- Component type: universal
- Layout: horizontal
- Gap: 1.5rem
- Component tag: ntv-thumbnail-item

Single thumbnail item with default settings

#### Instance 1: Video Item

- Label: Video Item

Config entries:
- `item`: `{"id":"vid-001","name":"Morning Highlights","type":"video","thumbnail":"https://picsum.photos/seed/ti1/640/360","url":"https://example.com/video.mp4","duration":"2:34"}`

Code example:

```html
<ntv-thumbnail-item [item]="thumbnailItem" (itemClick)="onItemClick($event)" />
```

### 2. Layouts

- Category: Examples
- Component type: universal
- Layout: horizontal
- Gap: 1rem
- Component tag: ntv-thumbnail-item

Grid vs. list orientation

#### Instance 1: Grid

- Label: Grid

Config entries:
- `layout`: `grid`
- `item`: `{"id":"g1","name":"Sunset.jpg","type":"image","thumbnail":"https://picsum.photos/seed/g1/400/300"}`

#### Instance 2: List

- Label: List

Config entries:
- `layout`: `list`
- `showMetadata`: `true`
- `item`: `{"id":"l1","name":"Sunset.jpg","type":"image","thumbnail":"https://picsum.photos/seed/l1/400/300","size":"2.4 MB","modified":"2026-07-30T07:05:57.089Z"}`

### 3. Selectable Grid Item

- Category: Configuration
- Component type: universal
- Layout: horizontal
- Gap: 1rem
- Component tag: ntv-thumbnail-item

Selection checkbox with two-way binding

#### Instance 1: Selectable

- Label: Selectable

Config entries:
- `selectable`: `true`
- `item`: `{"id":"s1","name":"Doc.pdf","type":"document","thumbnail":"https://picsum.photos/seed/s1/400/300"}`

Code example:

```html
<ntv-thumbnail-item [item]="item" [selectable]="true" [(selected)]="item.selected" (selectionToggle)="onSelect($event)" />
```

### 4. Channel Variant

- Category: Examples
- Component type: universal
- Layout: horizontal
- Gap: 1rem
- Component tag: ntv-thumbnail-item

Channel-styled size and variant presets

#### Instance 1: Channel

- Label: Channel

Config entries:
- `size`: `channel-md`
- `variant`: `channel`
- `item`: `{"id":"c1","name":"News Channel","type":"channel","thumbnail":"https://picsum.photos/seed/c1/300/300"}`

Code example:

```html
<ntv-thumbnail-item [item]="channelItem" size="channel-md" variant="channel" />
```
