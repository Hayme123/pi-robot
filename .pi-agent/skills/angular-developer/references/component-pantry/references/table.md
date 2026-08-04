---
tags:
  - component-docs
  - ntv360
  - component-pantry
  - table
---

# Component: Table

Read this file after selecting it from the component index. It is optimized for quick component lookup and implementation support.

## Summary
- Tag: `ntv-table`
- Slug: `table`
- Package: `@ntv360/component-pantry`
- Source: `component-pantry/table/table.manifest.ts`
- Playground controls: 10
- Properties: 37
- Demos: 9

## Description
A highly configurable table component with filtering, sorting, and advanced features.

## Features
- Column definitions - Flexible column configuration with field, header, visibility
- Filtering - Text, number, date, select filters per column
- Draggable columns - Reorder columns via drag and drop
- Draggable rows - Reorder rows via drag and drop
- Expandable rows - Custom expandable content per row
- Lockable rows - Pin rows to top
- Checkbox selection - Select multiple rows
- Pagination - Built-in pagination with show more
- Custom templates - header, body, expandedContent templates
- Column settings - Visibility toggles, localStorage persistence

## Playground Controls
| Control | Type | Default | Label | Description | Options | Content |
| --- | --- | --- | --- | --- | --- | --- |
| `tableTitle` | `text` | ` ` | Title | Optional title above the table |  | no |
| `filterEnabled` | `boolean` | `false` | Filter Enabled | Enable column filters |  | no |
| `columnDraggable` | `boolean` | `false` | Column Draggable | Allow column reordering |  | no |
| `rowDraggable` | `boolean` | `false` | Row Draggable | Allow row reordering |  | no |
| `hasCheckBox` | `boolean` | `false` | Has Checkbox | Enable row selection |  | no |
| `hasIndex` | `boolean` | `false` | Has Index | Show row index column |  | no |
| `expandableRows` | `boolean` | `false` | Expandable Rows | Enable expandable row content |  | no |
| `maxLockedRows` | `number` | `3` | Max Locked Rows | Maximum number of rows that can be locked/pinned to the top |  | no |
| `tableBGColor` | `color` | `#ffffff` | Table Background | Background color of the table body |  | no |
| `tableHeaderBGColor` | `color` | `#F9FAFB` | Header Background | Background color of the table header |  | no |

## Properties
| Property | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `columns` | `TableColumn[]` | yes | `[]` | Column definitions |
| `value` | `Record<string, unknown>[]` | no | `[]` | Original unmodified source data (not mutated internally) |
| `data` | `Record<string, unknown>[]` | no | `[]` | Table data (modifiable) |
| `tableStyle` | `TableStyle` | no | `{}` | Optional table styling configuration (CSS property/value map) |
| `tableTags` | `TableTag[]` | no | `[]` | Status legend entries displayed beside the table title. |
| `rowAccentField` | `string` | no | `''` | Row field used to select the leading status-rail color; an empty value disables the rail. |
| `rowAccentColors` | `Record<string, string>` | no | `{}` | Maps rowAccentField values to status-rail colors. |
| `columnDraggable` | `boolean` | no | `false` | Enable column reordering |
| `rowDraggable` | `boolean` | no | `false` | Enable row reordering |
| `expandableRows` | `boolean` | no | `false` | Enable expandable rows |
| `defaultMinWidth` | `number` | no | `100` | Default minimum column width in pixels |
| `showItemCount` | `boolean` | no | `true` | Show item count |
| `defaultMaxWidth` | `number` | no | `400` | Default maximum column width in pixels |
| `showColumnSettings` | `boolean` | no | `true` | Show column settings icon |
| `tableTitle` | `string` | no | `' '` | Title above table |
| `maxLockedRows` | `number` | no | `3` | Maximum number of rows that can be locked/pinned |
| `lockIdentifierField` | `string` | no | `'licenseKey'` | Field used to uniquely identify each row for locking or selection |
| `hasIndex` | `boolean` | no | `false` | Show row index column |
| `externalColumnControl` | `boolean` | no | `false` | Enables external column management — reorder/visibility changes are emitted as events instead of handled internally |
| `filterEnabled` | `boolean` | no | `false` | Enable column filters |
| `hasCheckBox` | `boolean` | no | `false` | Enable row selection |
| `storageKey` | `string` | no | `'ntv-table-columns'` | Custom localStorage key for persisting column visibility |
| `tableBGColor` | `string` | no | `'#ffffff'` | Background color of the table body |
| `tableHeaderBGColor` | `string` | no | `'#F9FAFB'` | Background color of the table header |
| `tableHeight` | `TableHeight` | no | `'600px'` | Table wrapper height |
| `totalDataLength` | `number \| null` | no | `null` | Total number of items available on the server, used for server-side/API pagination |
| `customIcon` | `any` | no | `''` | Custom SVG string for the filter icon |
| `settingButtonColor` | `string` | no | `''` | Color of the column settings button |
| `dataChange` | `EventEmitter<Record<string, unknown>[]>` | no | `N/A` | Emitted when data changes |
| `lockedItemsChange` | `EventEmitter<Record<string, unknown>[]>` | no | `N/A` | Emitted when locked/pinned rows change |
| `columnReorder` | `EventEmitter<ColumnReorderEvent>` | no | `N/A` | Emitted when column is reordered |
| `rowReorder` | `EventEmitter<RowReorderEvent>` | no | `N/A` | Emitted when row is reordered |
| `columnVisibilityChange` | `EventEmitter<{ column: TableColumn; visible: boolean }>` | no | `N/A` | Emitted when column visibility is toggled (used with externalColumnControl) |
| `columnsChange` | `EventEmitter<TableColumn[]>` | no | `N/A` | Emitted when internal column configuration changes |
| `selectedRowsChange` | `EventEmitter<Record<string, unknown>[]>` | no | `N/A` | Emitted when selection changes |
| `showMoreRequested` | `EventEmitter<void>` | no | `N/A` | Emitted when the "Show More" button is clicked to request the next page of data (server-side pagination) |
| `tableStateChange` | `EventEmitter<TableStateEvent>` | no | `N/A` | Emitted when internal state (filters, sort, pagination) changes |

## Demos
### 1. Basic Usage

- Category: Usage
- Component type: universal
- Layout: vertical
- Gap: 1rem
- Component tag: ntv-table

Simple table with columns and data

#### Instance 1: Basic Table

- Label: Basic Table

Config entries:
- `columns`: `[{"field":"name","header":"Name"},{"field":"email","header":"Email"},{"field":"role","header":"Role"}]`
- `data`: `[{"name":"John Doe","email":"john@example.com","role":"Admin"},{"name":"Jane Smith","email":"jane@example.com","role":"User"},{"name":"Bob Wilson","email":"bob@example.com","role":"Editor"}]`
- `tableHeight`: `300px`

Code example:

```html
columns = [
  { field: 'name', header: 'Name' },
  { field: 'email', header: 'Email' },
  { field: 'role', header: 'Role' }
];
<ntv-table [columns]="columns" [data]="data"></ntv-table>
```

### 2. With Filters

- Category: Examples
- Component type: universal
- Layout: vertical
- Gap: 1rem
- Component tag: ntv-table

Table with column filtering enabled

#### Instance 1: Filterable Table

- Label: Filterable Table

Config entries:
- `columns`: `[{"field":"name","header":"Name","filter":true,"filterType":"text"},{"field":"email","header":"Email","filter":true,"filterType":"text"},{"field":"role","header":"Role","filter":true,"filterType":"select","filterOptions":["Admin","User","Editor"]}]`
- `data`: `[{"name":"John Doe","email":"john@example.com","role":"Admin"},{"name":"Jane Smith","email":"jane@example.com","role":"User"},{"name":"Bob Wilson","email":"bob@example.com","role":"Editor"}]`
- `filterEnabled`: `true`
- `tableHeight`: `300px`

Code example:

```html
<ntv-table [columns]="columns" [data]="data" [filterEnabled]="true"></ntv-table>
```

### 3. With Row Index

- Category: Examples
- Component type: universal
- Layout: vertical
- Gap: 1rem
- Component tag: ntv-table

Table with row number column

#### Instance 1: Table with Index

- Label: Table with Index

Config entries:
- `columns`: `[{"field":"name","header":"Name"},{"field":"email","header":"Email"},{"field":"role","header":"Role"}]`
- `data`: `[{"name":"John Doe","email":"john@example.com","role":"Admin"},{"name":"Jane Smith","email":"jane@example.com","role":"User"},{"name":"Bob Wilson","email":"bob@example.com","role":"Editor"}]`
- `hasIndex`: `true`
- `tableHeight`: `300px`

### 4. With Checkbox Selection

- Category: Examples
- Component type: universal
- Layout: vertical
- Gap: 1rem
- Component tag: ntv-table

Table with row selection

#### Instance 1: Selectable Rows

- Label: Selectable Rows

Config entries:
- `columns`: `[{"field":"name","header":"Name"},{"field":"email","header":"Email"},{"field":"role","header":"Role"}]`
- `data`: `[{"name":"John Doe","email":"john@example.com","role":"Admin"},{"name":"Jane Smith","email":"jane@example.com","role":"User"},{"name":"Bob Wilson","email":"bob@example.com","role":"Editor"}]`
- `hasCheckBox`: `true`
- `lockIdentifierField`: `name`
- `tableHeight`: `300px`

Code example:

```html
<ntv-table [columns]="columns" [data]="data" [hasCheckBox]="true" lockIdentifierField="name" (selectedRowsChange)="onSelectionChange($event)"></ntv-table>
```

### 5. Draggable Columns

- Category: Examples
- Component type: universal
- Layout: vertical
- Gap: 1rem
- Component tag: ntv-table

Table with column reordering

#### Instance 1: Reorderable Columns

- Label: Reorderable Columns

Config entries:
- `columns`: `[{"field":"name","header":"Name"},{"field":"email","header":"Email"},{"field":"role","header":"Role"}]`
- `data`: `[{"name":"John Doe","email":"john@example.com","role":"Admin"},{"name":"Jane Smith","email":"jane@example.com","role":"User"},{"name":"Bob Wilson","email":"bob@example.com","role":"Editor"}]`
- `columnDraggable`: `true`
- `tableHeight`: `300px`

### 6. Lockable Rows

- Category: Examples
- Component type: universal
- Layout: vertical
- Gap: 1rem
- Component tag: ntv-table

Pin/lock rows to the top of the table, up to a configurable maximum

#### Instance 1: Locked Rows

- Label: Locked Rows

Config entries:
- `columns`: `[{"field":"name","header":"Name"},{"field":"email","header":"Email"},{"field":"role","header":"Role"}]`
- `data`: `[{"name":"John Doe","email":"john@example.com","role":"Admin"},{"name":"Jane Smith","email":"jane@example.com","role":"User"},{"name":"Bob Wilson","email":"bob@example.com","role":"Editor"}]`
- `maxLockedRows`: `2`
- `lockIdentifierField`: `name`
- `tableHeight`: `300px`

Code example:

```html
<ntv-table
  [columns]="columns"
  [data]="data"
  [maxLockedRows]="2"
  lockIdentifierField="name"
  (lockedItemsChange)="onLockedItemsChange($event)">
</ntv-table>
```

### 7. Custom Colors

- Category: Configuration
- Component type: universal
- Layout: vertical
- Gap: 1rem
- Component tag: ntv-table

Table with custom body and header background colors

#### Instance 1: Custom Theme

- Label: Custom Theme

Config entries:
- `columns`: `[{"field":"name","header":"Name"},{"field":"email","header":"Email"},{"field":"role","header":"Role"}]`
- `data`: `[{"name":"John Doe","email":"john@example.com","role":"Admin"},{"name":"Jane Smith","email":"jane@example.com","role":"User"},{"name":"Bob Wilson","email":"bob@example.com","role":"Editor"}]`
- `tableBGColor`: `#f8fafc`
- `tableHeaderBGColor`: `#e2e8f0`
- `tableHeight`: `300px`

Code example:

```html
<ntv-table [columns]="columns" [data]="data" tableBGColor="#f8fafc" tableHeaderBGColor="#e2e8f0"></ntv-table>
```

### 8. Server-Side Pagination

- Category: Configuration
- Component type: universal
- Layout: vertical
- Gap: 1rem
- Component tag: ntv-table

Table that requests additional pages from the parent using totalDataLength and showMoreRequested

#### Instance 1: Show More Requested

- Label: Show More Requested

Config entries:
- `columns`: `[{"field":"name","header":"Name"},{"field":"email","header":"Email"},{"field":"role","header":"Role"}]`
- `data`: `[{"name":"John Doe","email":"john@example.com","role":"Admin"},{"name":"Jane Smith","email":"jane@example.com","role":"User"},{"name":"Bob Wilson","email":"bob@example.com","role":"Editor"}]`
- `totalDataLength`: `50`
- `tableHeight`: `300px`

Code example:

```html
<ntv-table
  [columns]="columns"
  [data]="data"
  [totalDataLength]="totalCount"
  (showMoreRequested)="loadNextPage()">
</ntv-table>
```

### 9. Custom Title

- Category: Examples
- Component type: universal
- Layout: vertical
- Gap: 1rem
- Component tag: ntv-table

Table with custom title

#### Instance 1: Titled Table

- Label: Titled Table

Config entries:
- `columns`: `[{"field":"name","header":"Name"},{"field":"email","header":"Email"},{"field":"role","header":"Role"}]`
- `data`: `[{"name":"John Doe","email":"john@example.com","role":"Admin"},{"name":"Jane Smith","email":"jane@example.com","role":"User"},{"name":"Bob Wilson","email":"bob@example.com","role":"Editor"}]`
- `tableTitle`: `Team Members`
- `tableHeight`: `300px`

Code example:

```html
<ntv-table [columns]="columns" [data]="data" tableTitle="Team Members"></ntv-table>
```
