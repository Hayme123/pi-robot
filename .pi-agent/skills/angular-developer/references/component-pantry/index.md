# Component Pantry

Use `@ntv360/component-pantry` as the company-standard source for visual components. These references track package version `0.7.1`, whose peer range supports Angular 21 and 22; verify the installed package version before applying this API to another project.

## Component selection and usage

1. Search the index below before creating a visual component or adding another UI dependency.
2. When a match exists, use the documented `ntv-*` component.
3. Open only that component's file from `./references/`; do not load every component reference.
4. Prefer the typed `config` input when it reduces repeated template bindings.
5. Adapt generated demo markup to the [component](../components.md) and [styling](../component-styling.md) rules. Component references describe available APIs; demo-only inline styles, hardcoded colors, or legacy control-flow syntax are not implementation standards.

## Component Index

| Component | Tag | Slug | Description | Reference File Link |
| --- | --- | --- | --- | --- |
| Accordion | `ntv-accordion` | `accordion` | Simple accordion with ng-content projection for header and body. | [accordion.md](./references/accordion.md) |
| Autocomplete | `ntv-autocomplete` | `autocomplete` | Highly configurable autocomplete supporting single/multiple selection, custom filtering. | [autocomplete.md](./references/autocomplete.md) |
| Breadcrumbs | `ntv-breadcrumbs` | `breadcrumbs` | Flexible breadcrumbs component for displaying navigational hierarchy. | [breadcrumbs.md](./references/breadcrumbs.md) |
| Button | `ntv-button` | `button` | Versatile button with multiple variants, sizes, and states. | [button.md](./references/button.md) |
| Calendar | `ntv-calendar-base` | `calendar` | Fully interactive calendar with month, week, and day views. | [calendar.md](./references/calendar.md) |
| Card | `ntv-card` | `card` | Flexible card component with comprehensive styling options. | [card.md](./references/card.md) |
| Carousel | `ntv-carousel` | `carousel` | Advanced carousel with thumbnail gallery integration. | [carousel.md](./references/carousel.md) |
| Checkbox | `ntv-checkbox` | `checkbox` | Flexible checkbox with multiple sizes, colors, and states. | [checkbox.md](./references/checkbox.md) |
| Content View | `ntv-content-view` | `content-view` | Flexible content view for displaying various types of content items. | [content-view.md](./references/content-view.md) |
| Date Picker | `ntv-date-picker` | `date-picker` | Date picker with popover calendar, year picker, and multiple variants. | [date-picker.md](./references/date-picker.md) |
| Date Range Picker | `ntv-date-range-picker` | `date-range-picker` | Composite date range picker wrapping two `ntv-date-picker` instances. | [date-range-picker.md](./references/date-range-picker.md) |
| Donut Graph | `ntv-donut-graph` | `donut-graph` | Interactive donut chart powered by ApexCharts. | [donut-graph.md](./references/donut-graph.md) |
| Dropdown | `ntv-dropdown` | `dropdown` | Flexible dropdown select component with multiple variants and sizes. | [dropdown.md](./references/dropdown.md) |
| Error States | `ntv-error-states` | `error-states` | Full-screen and card-style pages for common HTTP error states. | [error-states.md](./references/error-states.md) |
| Graph | `ntv-graph` | `graph` | Versatile line and bar chart powered by ApexCharts with time-based filtering. | [graph.md](./references/graph.md) |
| Grid | `ntv-grid` | `grid` | Lightweight CSS grid layout wrapper component. | [grid.md](./references/grid.md) |
| Horizontal Graph | `app-horizontal-graph` | `horizontal-graph` | Horizontal progress/timeline chart comparing values across rows. | [horizontal-graph.md](./references/horizontal-graph.md) |
| Input | `ntv-input` | `input` | Comprehensive input component with validation and form integration. | [input.md](./references/input.md) |
| Modal | `ntv-modal` | `modal` | Highly configurable modal with content projection support. | [modal.md](./references/modal.md) |
| Offcanvas | `ntv-offcanvas` | `offcanvas` | Slide-in drawer panel animating in from any screen edge. | [offcanvas.md](./references/offcanvas.md) |
| Popover | `ntv-popover` | `popover` | Floating overlay panel positioned relative to a trigger. | [popover.md](./references/popover.md) |
| Progress | `ntv-progress` | `progress` | Horizontal progress bar with label, percentage, and remaining value. | [progress.md](./references/progress.md) |
| Radial Graph | `ntv-radial-graph` | `radial-graph` | Circular progress ring component displaying a single KPI/metric. | [radial-graph.md](./references/radial-graph.md) |
| Searchbar | `ntv-searchbar` | `searchbar` | Combines an input field with a search button and suggestions. | [searchbar.md](./references/searchbar.md) |
| Skeleton | `ntv-skeleton` | `skeleton` | Shimmer skeleton loader with automatic content detection. | [skeleton.md](./references/skeleton.md) |
| Stack | `ntv-stack` | `stack` | Visual stacked card component showing layered thumbnails. | [stack.md](./references/stack.md) |
| Stepper | `ntv-stepper` | `stepper` | Flexible stepper supporting multiple variants and orientations. | [stepper.md](./references/stepper.md) |
| Table | `ntv-table` | `table` | Highly configurable table with filtering, sorting, and pagination. | [table.md](./references/table.md) |
| Tabs | `ntv-tabs` | `tabs` | Tab navigation bar emitting the active index on selection. | [tabs.md](./references/tabs.md) |
| Template | `ntv-template` | `template` | Digital-signage layout renderer for positioning content zones. | [template.md](./references/template.md) |
| Textarea | `ntv-textarea` | `textarea` | Purpose-built multiline textarea matching Input's API. | [textarea.md](./references/textarea.md) |
| Thumbnail Gallery | `ntv-thumbnail-gallery` | `thumbnail-gallery` | Renders a grid or list of thumbnail cards. | [thumbnail-gallery.md](./references/thumbnail-gallery.md) |
| Thumbnail Item | `ntv-thumbnail-item` | `thumbnail-item` | Standalone media card with selection, actions, and context-menu support. | [thumbnail-item.md](./references/thumbnail-item.md) |
| Thumbnail Preview | `ntv-thumbnail-preview` | `thumbnail-preview` | Media card with hover, overlay, action buttons, and lightbox. | [thumbnail-preview.md](./references/thumbnail-preview.md) |
| Thumbnail Tag | `ntv-tag` | `thumbnail-tag` | Color-coded media type or category badge. | [thumbnail-tag.md](./references/thumbnail-tag.md) |
| Timepicker | `ntv-timepicker` | `timepicker` | Scrollable time picker with 12h/24h format and form integration. | [timepicker.md](./references/timepicker.md) |
| Toast | `ntv-toast` | `toast` | Self-dismissing notification banner with progress and config. | [toast.md](./references/toast.md) |
| Toggle Button | `ntv-toggle-button` | `toggle-button` | Switch-style toggle control with custom sizes and labels. | [toggle-button.md](./references/toggle-button.md) |
| Uploader | `ntv-uploader` | `uploader` | Drag-and-drop media upload panel with Transloadit integration. | [uploader.md](./references/uploader.md) |
| Video Preview | `ntv-video-preview` | `video-preview` | Video player panel with playback, scrubbing, and fullscreen support. | [video-preview.md](./references/video-preview.md) |
