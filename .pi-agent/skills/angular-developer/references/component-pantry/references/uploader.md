---
tags:
  - component-docs
  - ntv360
  - component-pantry
  - uploader
---

# Component: Uploader

Read this file after selecting it from the component index. It is optimized for quick component lookup and implementation support.

## Summary
- Tag: `ntv-uploader`
- Slug: `uploader`
- Package: `@ntv360/component-pantry`
- Source: `component-pantry/uploader/uploader.manifest.ts`
- Playground controls: 2
- Properties: 22
- Demos: 1

## Description
A drag-and-drop media upload panel supporting images and videos. Handles file validation, duplicate detection, inline renaming, progress tracking, and Transloadit integration.

## Playground Controls
| Control | Type | Default | Label | Description | Options | Content |
| --- | --- | --- | --- | --- | --- | --- |
| `duplicateResults` | `textarea` | `[]` | Duplicate Results (JSON) | Array of DuplicateResult objects returned from the parent duplicate check |  | no |
| `uploadConfig` | `textarea` | `{"provider":"transloadit","transloadit":{"key":"DEMO_KEY","templateId":"DEMO_TEMPLATE"}}` | Upload Config (JSON) | Provider configuration — transloadit or filestack |  | no |

## Properties
| Property | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `duplicateResults` | `DuplicateResult[]` | no | `[]` | Duplicate check results returned by the parent after filesSelected emission. Each entry contains fileId, isDuplicate, and optional suggestedName. |
| `uploadConfig` | `UploadConfig \| null` | no | `null` | Upload provider configuration. Supports transloadit (full) and filestack (stub). |
| `existingLibraryNames` | `Set<string>` | no | `new Set()` | Set of filename stems already present in the media library, used for client-side duplicate/name-collision checks. |
| `filesSelected` | `EventEmitter<UploadFile[]>` | no | `-` | Output: emitted immediately after the user selects or drops files, before upload begins. Use this to trigger duplicate checking. |
| `uploadConfirmed` | `EventEmitter<UploadFile[]>` | no | `-` | Output: emitted when the user clicks the Upload button. The parent calls the upload service. |
| `close` | `EventEmitter<void>` | no | `-` | Output: emitted when the user clicks Close or Continue (after success). Use to hide the uploader. |
| `uploadCancelled` | `EventEmitter<void>` | no | `-` | Output: emitted when the user cancels an in-progress upload. |
| `fileRenamed` | `EventEmitter<RenamedFileEvent>` | no | `-` | Emitted after an upload file is renamed so the parent can validate the new name. |
| `accentColor` | `string` | no | `'#D10334'` | Accent color (CSS value) used for progress bars and active states. |
| `maxFiles` | `number` | no | `10` | Maximum number of files that can be selected in one batch. |
| `isCheckingDuplicates` | `boolean` | no | `false` | Whether the parent is currently checking selected files for duplicates (shows a loading state). |
| `showProviders` | `boolean` | no | `false` | Whether to show the upload provider selector (transloadit/filestack). |
| `hideScrollbar` | `boolean` | no | `false` | Whether to visually hide the file list scrollbar. |
| `validationErrorTimer` | `boolean` | no | `false` | Enables auto-dismiss for the validation error banner using the default 5000ms delay. |
| `validationErrorDismissMs` | `number \| null` | no | `null` | Custom auto-dismiss delay (ms) for the validation error banner. Overrides validationErrorTimer when set. |
| `showContentTab` | `boolean` | no | `true` | Whether to show the content-type tab (images/videos/documents) selector. |
| `acceptImages` | `boolean` | no | `true` | Whether image files are accepted for upload. |
| `imageTypes` | `string[]` | no | `['png', 'jpg', 'jpeg']` | Image extensions to accept when acceptImages is true. |
| `acceptVideos` | `boolean` | no | `true` | Whether video files are accepted for upload. |
| `videoTypes` | `string[]` | no | `['mp4', 'webm']` | Video extensions to accept when acceptVideos is true. |
| `acceptDocuments` | `boolean` | no | `false` | Whether document files are accepted for upload. |
| `documentTypes` | `string[]` | no | `['pdf', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'ppt', 'pptx']` | Document extensions to accept when acceptDocuments is true. |

## Demos
### 1. Default Uploader

- Category: Examples
- Component type: custom
- Layout: vertical
- Gap: N/A
- Component tag: ntv-uploader

Drag-and-drop uploader with validation, duplicate detection, and Transloadit integration.

#### Instance 1

Rendered HTML example:

```html
<ntv-uploader
  [duplicateResults]="[]"
  [uploadConfig]="{ provider: 'transloadit', transloadit: { key: 'DEMO_KEY', templateId: 'DEMO_TEMPLATE' } }"
  (filesSelected)="onFilesSelected($event)"
  (uploadConfirmed)="onUploadConfirmed($event)"
  (close)="showUploader = false"
/>
```
