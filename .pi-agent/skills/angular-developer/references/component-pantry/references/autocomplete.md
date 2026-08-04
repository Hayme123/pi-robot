---
tags:
  - component-docs
  - ntv360
  - component-pantry
  - autocomplete
---

# Component: Autocomplete

Read this file after selecting it from the component index. It is optimized for quick component lookup and implementation support.

## Summary
- Tag: `ntv-autocomplete`
- Slug: `autocomplete`
- Package: `@ntv360/component-pantry`
- Source: `component-pantry/autocomplete/autocomplete.manifest.ts`
- Playground controls: 11
- Properties: 26
- Demos: 5

## Description
A highly configurable autocomplete component that supports single and multiple selection, custom filtering, and more.

## Playground Controls
| Control | Type | Default | Label | Description | Options | Content |
| --- | --- | --- | --- | --- | --- | --- |
| `label` | `text` | `Search` | Label | Label text displayed above the autocomplete |  | no |
| `placeholder` | `text` | `Search...` | Placeholder | Placeholder text shown in the input |  | no |
| `size` | `select` | `md` | Size | Size of the autocomplete input | xs, sm, md, lg, xl | no |
| `variant` | `select` | `default` | Variant | Visual variant of the autocomplete | default, soft, ghost, custom | no |
| `disabled` | `boolean` | `false` | Disabled | Whether the autocomplete is disabled |  | no |
| `loading` | `boolean` | `false` | Loading | Whether the autocomplete is in a loading state |  | no |
| `multiple` | `boolean` | `false` | Multiple Selection | Allow multiple options to be selected |  | no |
| `searchable` | `boolean` | `true` | Searchable | Allow searching through options |  | no |
| `clearable` | `boolean` | `true` | Clearable | Show clear button when value is present |  | no |
| `checkbox` | `boolean` | `false` | Show Checkboxes | Show checkboxes next to options |  | no |
| `deletable` | `boolean` | `false` | Deletable Options | Enable per-option delete action |  | no |

## Properties
| Property | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `options` | `AutocompleteData` | no | `[]` | Array of options or grouped options |
| `value` | `AutocompleteValue` | no | `undefined` | Directly sets the selected value(s) without ngModel/formControl. Single-select: pass a value. Multiple-select: pass an array of values. Matches options by value, falling back to label. |
| `label` | `string \| null` | no | `null` | Label text displayed above the autocomplete |
| `size` | `'xs' \| 'sm' \| 'md' \| 'lg' \| 'xl'` | no | `'md'` | Size of the autocomplete input |
| `variant` | `string` | no | `'default'` | Visual variant or custom hex color for theming |
| `disabled` | `boolean` | no | `false` | Whether the autocomplete is disabled |
| `loading` | `boolean` | no | `false` | Whether the autocomplete is in a loading state |
| `config` | `Partial<AutocompleteConfig>` | no | `{}` | Configuration object for DRY usage |
| `customFilter` | `AutocompleteFilterFn \| null` | no | `null` | Custom filter function for advanced option filtering |
| `customDropdownPlacement` | `'below' \| 'above' \| null` | no | `null` | Dropdown placement relative to trigger |
| `deletable` | `boolean` | no | `false` | Enable per-option delete action |
| `showLabel` | `boolean` | no | `true` | Whether to show the label |
| `error` | `string \| null` | no | `null` | Error message text |
| `info` | `string \| null` | no | `null` | Informational text displayed below the autocomplete |
| `id` | `string` | no | `''` | Unique identifier for the autocomplete element |
| `maxDisplayChips` | `number` | no | `5` | Maximum number of chips to display before showing overflow indicator |
| `chipColor` | `string` | no | `'primary'` | Color scheme for chips |
| `mainHoverColor` | `string` | no | `''` | Custom hover color applied to dropdown items and interactive elements |
| `hoverBgColor` | `string` | no | `''` | Custom background color for hover state on dropdown items |
| `customChipColors` | `object \| null` | no | `null` | Custom color overrides for chip elements (background, text, border) |
| `optionColors` | `object \| null` | no | `null` | Custom color overrides for dropdown option elements |
| `checkboxColors` | `object \| null` | no | `null` | Custom color overrides for checkbox elements in multi-select mode |
| `selectionChange` | `EventEmitter<AutocompleteChangeEvent>` | no | `N/A` | Event emitted when selection changes |
| `searchChange` | `EventEmitter<string>` | no | `N/A` | Event emitted when search term changes |
| `dropdownToggle` | `EventEmitter<boolean>` | no | `N/A` | Event emitted when the dropdown opens or closes |
| `deleteOption` | `EventEmitter<AutocompleteOption>` | no | `N/A` | Event emitted when a delete action is requested for an option |

## Demos
### 1. Basic Usage

- Category: Usage
- Component type: universal
- Layout: vertical
- Gap: N/A
- Component tag: ntv-autocomplete

Simple autocomplete with options

#### Instance 1: Basic Autocomplete

- Label: Basic Autocomplete

Props:
- `label`: `Country`
- `options`: `[{"label":"United States","value":"us"},{"label":"Canada","value":"ca"}]`

Code example:

```html
<ntv-autocomplete label="Country" [options]="options"></ntv-autocomplete>
```

### 2. Multiple Selection

- Category: Examples
- Component type: universal
- Layout: vertical
- Gap: N/A
- Component tag: ntv-autocomplete

Select multiple items

#### Instance 1: Multiple Skills

- Label: Multiple Skills

Props:
- `label`: `Skills`
- `config`: `{"multiple":true}`
- `options`: `[{"label":"Angular","value":"angular"},{"label":"React","value":"react"},{"label":"Vue","value":"vue"}]`

### 3. Grouped Options

- Category: Examples
- Component type: universal
- Layout: vertical
- Gap: N/A
- Component tag: ntv-autocomplete

Options organized in groups

#### Instance 1: Grouped Items

- Label: Grouped Items

Props:
- `options`: `[{"label":"North America","options":[{"label":"USA","value":"us"},{"label":"Canada","value":"ca"}]},{"label":"Europe","options":[{"label":"Germany","value":"de"},{"label":"France","value":"fr"}]}]`

### 4. Checkbox Multi-Select

- Category: Examples
- Component type: universal
- Layout: vertical
- Gap: N/A
- Component tag: ntv-autocomplete

Multiple selection with checkboxes and pre-selected options

#### Instance 1: Permissions

- Label: Permissions

Props:
- `label`: `Permissions`
- `config`: `{"multiple":true,"checkbox":true,"searchable":true}`
- `options`: `[{"label":"Read","value":"read","selected":true},{"label":"Write","value":"write"},{"label":"Delete","value":"delete"}]`

Code example:

```html
<ntv-autocomplete
  [options]="permissions"
  [config]="{ multiple: true, checkbox: true, searchable: true }"
  label="Permissions"
  (selectionChange)="onPermsChange($event)">
</ntv-autocomplete>
```

### 5. Deletable Options

- Category: Examples
- Component type: universal
- Layout: vertical
- Gap: N/A
- Component tag: ntv-autocomplete

Per-option delete affordance for new/draft items

#### Instance 1: Tags

- Label: Tags

Props:
- `label`: `Tags`
- `deletable`: `true`
- `config`: `{"searchable":true}`
- `options`: `[{"label":"Urgent","value":"urgent"},{"label":"My Custom Tag","value":"custom","status":"new"}]`

Code example:

```html
<ntv-autocomplete
  [options]="tags"
  [deletable]="true"
  [config]="{ searchable: true }"
  (deleteOption)="onDeleteTag($event)">
</ntv-autocomplete>
```
