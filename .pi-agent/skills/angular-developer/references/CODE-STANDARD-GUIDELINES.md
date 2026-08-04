<!-- Empty Length Check -->
// do not do this ❌

if (data.length > 0) { ... }


// do this ✅

if (data.length) { ... }


<!-- Falsy values, including 0, evaluate to false in boolean contexts, while truthy values evaluate to true. This allows for concise conditional statements like if (data.length) to check if data.length is not 0. -->

<!-- One Liner If/Else’s -->
// do not do this ❌

// Possible one liner if statement
if (mycondition_is_just_one_block) {
    this.callAMethod();
}

// One liner if/else statement
if (mycondition_is_just_one_block) {
    return false;
} else {
    this.callMethod();
}


// do this ✅

if (mycondition_is_just_one_block) return;

if (mycondition_is_just_one_block) return false;
else this.callMethod();


<!-- Simpler and less lines, this is optional. -->


<!-- Simplify and reduce the usage of curly braces -->
// do not do this ❌

private methodName() {
    if (myCondition) {
        doThis...
        doThat...
    } else {
        doThis1...
        doThat...
    }
}


// do this ✅

private methodName() {
    if (myCondition) {
        doThis...
        doThat...
        return;
    }
  
    doThis1...
    doThat...
}


<!-- if myCondition is true, the method will execute doThis and doThat, then immediately return, skipping the remaining code. If myCondition is false, it will proceed to execute doThis1 and doThat. This eliminates the need for the else block and reduces the number of curly braces. -->


<!-- Declare Access Modifiers -->
// do not do this ❌

getTotalPlaylist() { ... }


// do this ✅

private|public getTotalPlaylist() { ... }


<!-- Introducing the private or public keywords aids in discerning whether a method is exclusively accessed within the TypeScript scope or utilized within the HTML context. -->


<!-- Avoid usage of  object orany -->
// do not do this ❌

variableOne: any = {
    firstname: 'Test',
    lastname: 'Testing',
    age: 9
}

variableTwo: object = {
 ...
}

variableThree: any[] = [
  {...}
]


// do this ✅

// Create an interface
export interface Person {
    firstname: string,
    lastname: string,
    age: number
}

// Use it on your variable
variableOne: Person = {
    firstname: 'Test',
    lastname: 'Testing',
    age: 9
}

<!-- By explicitly typing variableOne with the Person interface, you ensure that it adheres to the specified structure, avoiding the usage of any and providing type safety throughout your codebase. -->


<!-- Class parameters -->
// do not do this ❌

export class Person {
  firstname: string;
  lastname: string;
  age: number
  
  constructor(firstname: string, lastname: string, age: number) {
      this.firstname = firstname;
      this.lastname = lastname;
      this.age = age;
  }
}
<!-- When instantiated, we need to follow the order of parameters declared via the constructor. Might be difficult for classes with large number of parameters -->
<!-- const person1 = new Person('Kumiko', 'Yamaguchi', 25); -->


// do this ✅

export class Person {
  firstname: string;
  lastname: string;
  age: number
  
  constructor(p: {firstname: string, lastname: string, age: number}) {
      this.firstname = p.firstname;
      this.lastname = p.lastname;
      this.age = p.age;
  }
}
<!-- When instantiated, it is required to add in the property name but with this approach, we no longer need to follow parameter order set via the constructor, this helps a lot especially for classes that have large number of parameters. -->
<!-- const person1 = new Person({
    age: 0,
    firstname: 'Kumiko',
    lastname: 'Yamaguchi'
}) -->

<!-- "Do" approach: The constructor accepts a single parameter, p, containing firstname, lastname, and age properties. Instantiating the Person class involves providing an object with these properties, allowing for flexibility and clearer code, particularly with a large number of parameters or when their order isn't intuitive. This approach also facilitates easy parameter expansion without disrupting existing instantiations. -->


<!-- Constant file usage -->
<!-- single-playlist-v2.component.html: hard-coding static texts -->
// do not do this ❌

<div class="playlist-settings d-flex">
  <button
     mat-button
     mat-raised-button
     class="theme-btn mr-2"
     (click)="playlistSettingClicked(edit)">
     <i class="fas fa-edit text-green mr-3"></i>
     <small class="font-weight-bold">Edit</small>
  </button>
  <button
     mat-button
     mat-raised-button
     class="theme-btn mr-2"
     (click)="playlistSettingClicked(clone)">
     <i class="fas fa-copy text-green mr-3"></i>
     <small class="font-weight-bold">Clone</small>
  </button>
  <button
     mat-button
     mat-raised-button
     class="theme-btn mr-2"
     (click)="playlistSettingClicked(push-updates)">
     <i class="fas fa-uploadtext-green mr-3"></i>
     <small class="font-weight-bold">Push Updates</small>
  </button>
</div>

<!-- PlaylistSetting.ts (constant file) -->
// do this ✅

export const PLAYLIST_SETTING_BUTTONS = [
    {
        label: 'Edit',
        action: PLAYLIST_SETTING_ACTIONS.edit,
        icon: 'fas fa-edit',
    },
    {
        label: 'Clone',
        action: PLAYLIST_SETTING_ACTIONS.clone,
        icon: 'fas fa-copy',
    },
    {
        label: 'Push Updates',
        action: PLAYLIST_SETTING_ACTIONS.pushUpdates,
        icon: 'fas fa-upload',
    },
];

<!-- single-playlist-v2.component.ts: import the constant file and instantiate -->
import {PLAYLIST_SETTING_BUTTONS } from './constants';

export class SinglePlaylistV2Component {
    playlistSettings = PLAYLIST_SETTING_BUTTONS;
    ....
}

<!-- single-playlist-v2.component.html: make use of the variable stored -->
<div class="playlist-settings d-flex">
    <button
      *ngFor="let p of playlistSettings"
      mat-button
      mat-raised-button
      class="theme-btn mr-2"
      (click)="playlistSettingClicked(p.action)">
      <i class="{{ p.icon }} text-green mr-3"></i>
       <small class="font-weight-bold">{{ p.label }}</small>
    </button>
</div>


<!-- To eliminate hard-coding static texts, make use of constants file to contain these values in a single file. -->
<!-- This can then be reused for other components just by importing the constant file. -->
<!-- Other examples can be messages from pop-ups. -->


<!-- Use constor let when declaring variables -->
// do not do this ❌

var playlistContents = [];
var totalContentCount = 10;


// do this ✅

let playlistContents = [];
const totalContentCount = 10;


<!-- Do use const or let when declaring variables. Avoid using var because its scope is uncertain.  Which sometimes causes unpredictable results. The value gets overwritten if you declare it in a different scope. -->
<!-- const and let on the other hand, are block-scoped, which already sets boundaries. These are then bound to their specific scopes. -->
<!-- Also, as much as possbile, try to use const unless the value of the variable is dynamic or gets reassigned frequently. -->


<!-- Variable naming -->
// do not do this ❌

export class AppComponent {

  // using Camel Case on variables with decorators 
  @Input() playlistContents = [];
  
  // vague or unclear naming
  d_admin = new DealerAdmin();
  
  // using both Snake Case and Camel Case
  is_dealerAdmin = false; 
  
  // inaccurate variable name
  // this is clearly an array of IDs and not dealers
  dealers = [ 'asd11e123', 'czc2123', 'dasd312' ];
  
  // not using the proper Camel Case
  userID = 'asdas123123asdf414df';

  // not using the '_' prefix
  constructor(private dealerService: DealerService) {
    ...
  }

}


// do this ✅

export class AppComponent {
  
  // use camelCase on decorated variables too
  @Input() playlistContents = [];
  
  // use camelCase on variables with no decorators
  dealerAdmin = new DealerAdmin();
  
  // use only one case on a variable
  isDealerAdmin = false;
  
  // use explicit naming
  dealerIds = [ 'asd11e123', 'czc2123', 'dasd312' ];
  
  // proper use of camelCase
  userId = 'asdas123123asdf414df';
  
  // service variables should stay explicit and readable
  constructor(private dealerService: DealerService) {
    ...
  }
  
}


<!-- Do use proper cases and explicit naming on variables. -->
<!-- For variables using decorators such as @Input or @Output, use camelCase. -->
<!-- All other variable names should use camelCase. -->
<!-- Service variables should be explicit, readable, and context-based. No underscore prefix requirement. -->
<!-- Also ensure that your variable names are explicit, or accurately describes the data in the variable. This is to prevent confusion and to promote readability. -->


<!-- Variable Declaration -->
// do not do this ❌

name = "";
age: number;


// do this ✅

/** JSDOC **/
public name: string = "";

/** JSDOC **/
public age: number = 1;


<!-- Function naming -->
// do not do this ❌

export class AppComponent {
  ...
  
  // using mixed cases
  get_dealerData(): DealerData[] {
    ...
  }
  
  // inaccurate function naming
  // this clearly returns deal
  getDealer(): string {
    const dealerIds = ['1', '2', '3'];
    return dealerIds.filter(x => x === '1');
  }
  
  // using Snake Case
  private async export_dealer_data(): void {
    ...
  }

}


// do this ✅

export class AppComponent {
  ...
  
  // using mixed cases
  getDealerData(): DealerData[] {
    ...
  }
  
  // inaccurate function naming
  // this clearly returns deal
  getDealerIds(): string {
    const dealerIds = ['1', '2', '3'];
    return dealerIds.filter(x => x === '1');
  }
  
  // use Camel Case
  private async exportDealerData(): void {
    ...
  }

}


<!-- Do use proper cases and explicit naming on functions. -->
<!-- CamelCase should be used for all function names, including arrow functions. -->
<!-- Also ensure accurate and explicit naming on functions so as to avoid confusion and to make the code readable. -->


<!-- Declare default variable values -->
// do not do this ❌

let title: string = ''; 
let age: number = 18;
let dealer: Dealer = new Dealer();


// do this ✅

let title = '';
let age = 18;
let dealer = new Dealer();


<!-- Do declare initial values for all variables. Especially variables that are used to hold values of a specific data type.  -->
<!-- If it is difficult to intially assign a value to a variable, then make sure to indicate a type on the variable. Especially if it gets assigned null or undefined. -->
<!-- Furthermore, in most cases, there is no need to declare the variable type if the value being assigned to it is a primitive data type. -->


<!-- Consistent primitive data typing -->
// do not do this ❌

let page: number|string;
page = 2;
page = '3';


// do this ✅

let page: number;
page = 2;
page = 3;


<!-- As much as possible, use one primitive data type on a variable. This is to avoid confusion, particularly in creating tests or checks on said variable.  -->


<!-- Declare function return types -->
// do not do this ❌

getDealers(dealerId: string){
  let data: Dealers[] = []; 
  ...
  return data;
}

...

private getDealerByName(name: string) {
  let data = new Dealer();
  ...
  return data;
}

...

const parseDealerName = (name: string) => {
  let parsedName = '';
  ...
  return parsedName;
}


// do this ✅

getDealers(dealerId: string): Dealers[] {
  let data: Dealers[] = [];
  ...
  return data;
}

...

private getDealerByName(name: string): Dealer {
  let data = new Dealer();
  ...
  return data;
}

...

const parseDealerName: string = (name: string) => {
  let parsedName = '';
  ...
  return parsedName;
}


<!-- Do declare function return types, it promotes readability and maintanability. Doing this will also help with development as it will warn you if ever there are any changes made that altering the return type. -->


<!-- Group variables by access modifiers -->
<!-- Sort variables alphabetically -->
// do not do this ❌

export class AppComponent {
  isDealerAdmin = false;
  private hasDataLoaded = false;
  hasNoHost = false;
  private isAdmin = true;
  @Input() hostData = [];
  activatedLicense = false;
  @Output() selectedDealer = null;
  protected unsubscribe = new Subject<void>();
  
  constructor(private _auth: AuthService) {
    ...
  }
  
  ...
}


// do this ✅

export class AppComponent{
  @Input() hostData = [];
  @Output() selectedDealer = null;
  activatedLicense = false;
  hasNoHost = false;
  isDealerAdmin = false;  
  private hasDataLoaded = false;
  private isAdmin = true;  
  protected unsubscribe = new Subject<void>();
  
  constructor() {
    ...
  }
  
  ...
}


<!-- Do arrange variables in an orderly manner. In particular, group the variables by access modifiers in the following order: -->
<!-- public → private → protected -->
<!-- And then proceed to sort alphabetically. -->
<!-- Variable Sort: -->
<!-- decorators
Input
Output -->
<!-- public
variables accessible in the html side -->
<!-- private
variables within the ts file only -->
<!-- protected
special variables that -->


<!-- Group functions by access modifiers -->
<!-- Sort functions alphabetically -->
// do not do this ❌

export class AppComponent {
  ...
  
  constructor() {
    ...
  }
  
  private getDealers(): void { 
    ... 
  }
  
  getDealerById(): void {
    ...
  }
  
  protected getCurrentUser(): void {
    ...
  }
  
  submitForm(): void {
    ...
  }

}


// do this ✅

export class AppComponent {
  ...
  
  constructor() {
    ...
  }
  
  getDealerById(): void {
    ...
  }
  
  submitForm(): void {
    ...
  }
  
  private getDealers(): void { 
    ... 
  }
  
  protected getCurrentUser(): void {
    ...
  }

}


<!-- Do arrange functions in an orderly manner. In particular, group the variables by access modifiers in the following order: -->
<!-- public → private → protected -->
<!-- And then proceed to sort alphabetically. -->
<!-- New methods go to last position or after the method it is related to. -->
<!-- Methods with access modifiers will be add to the last/latest position? -->


<!-- Bootstrap Row and Column Class Usage -->
// do not do this ❌

<div class="container">
      <div class="col-lg-12">
          <p>My mother left me!</p>
      </div> <!-- col class without a parent row -->
</div>


// do this ✅

<div class="container">
      <div class="row">
          <div class="col-lg-12">
              <h1>Happy Family!</h1>
              
              <div class="row">
                  <div class="col-lg-8">...</div>
                  <div class="col-lg-4">...</div>
              </div>
          </div>
      </div>
</div>


<!-- In Bootstrap css framework, each .col-* is placed within a parent .row class, ensuring proper alignment within the Bootstrap grid system. -->
<!-- Never use a .col-* class without its parent which is the .row class. This is a rule even when trying to nest bootstrap rows and columns -->
<!-- Keep in mind:
1 Level Implementation: row → col
Nested: row → col → row → col -->


<!-- Angular (click)-ables -->
// do not do this ❌

<span class="fas fa-times" (click)="delete()"></span>


// do this ✅

<button (click)="delete()">
    <span class="fas fa-times">
    </span>
</button>


<!-- For clickables, if the component is expected to behave as a button, always wrap with <button> tags. -->
<!-- There will be cases when there are custom components or containers that will have a click trigger which is fine as long as they’re not expected to display and behave as a button. -->


<!-- console logging -->
// do not do this ❌

this._apiCall().subscribe(
  (data) => {
    ...
  }, 
  (error) => {
    // logging error
    console.log('Error': error)
  }
)


// do this ✅

// instead of console.log, use console.error
(error) => {
    console.error('Error': error)
}
<!-- On version 2, we aim to have a centralized error handling for API calls. -->


<!-- While the visual representation may remain unchanged when inspected through the browser's developer tools, our aim is to minimize the presence of console.log statements throughout the site.  -->
<!-- However, permitting console.error provides us with a means of tracking errors specifically within our codebase, ensuring that our logging focuses primarily on identifying and addressing critical issues. -->

<!-- ═══════════════════════════════════════════════════════════════════════════
     CSS / SCSS STANDARDS
     Established through hayme corrections — non-negotiable for all components
════════════════════════════════════════════════════════════════════════════ -->

<!-- CLASS NAMING — BEM (Block Element Modifier) -->

// do not do this ❌ (flat semantic names)
.stat-card-header { ... }
.nav-item.active { ... }

// do this ✅ (BEM is required)
.stat-card {
  &__header { ... }
  &__header--active { ... }
}
.navbar__menu__item--selected { ... }

<!-- Use BEM (Block__Element--Modifier) naming convention for all CSS classes. -->
<!-- Block: main component (.card, .menu, .button) -->
<!-- Element: child of block, denoted by __ (.card__title, .menu__item) -->
<!-- Modifier: variation of block/element, denoted by -- (.button--primary, .menu__item--active) -->

<!-- TAILWIND @apply — Use for ALL sizing/spacing/color values -->

// ❌ WRONG — raw pixel values
.dealers__icon {
  width: 32px;
  height: 32px;
  border-radius: 999px;
}

// ✅ CORRECT — Tailwind via @apply
.dealers__icon {
  @apply w-8 h-8 rounded-full;
}

// ✅ CORRECT — @apply one line, raw CSS only for values Tailwind can't express
.card {
  @apply flex items-center justify-between bg-white rounded-xl;
  box-shadow: 0 4px 15px rgba(9, 22, 53, 0.04);  // raw CSS only when Tailwind can't do it
}

<!-- Use @apply for ALL layout, spacing, sizing, and color values.
     Tailwind covers px/rem sizes, w/h, rounded, colors, flex, grid, gap, etc.
     Raw CSS only when Tailwind truly cannot express the value (e.g. complex box-shadows).
     Never hardcode hex colors in component HTML/SCSS/TS styling config.
     Add/update semantic color tokens in tailwind.config.js first, then consume those tokens in SCSS. -->

<!-- ═══════════════════════════════════════════════════════════════════════════
     🚨🚨🚨 ::ng-deep — FORBIDDEN FOR COLOR OVERRIDING 🚨🚨🚨
══════════════════════════════════════════════════════════════════════════════

**`::ng-deep` MUST NOT be used to change colors of NTV components.**

NTV components get their colors directly from tailwind.config.js via the `variant` property.
All color tokens (accent, primary, info, danger, etc.) are defined in tailwind.config.js.

To color an NTV component:
  ✅ Use `variant="<color>"` directly on the element (e.g., variant="accent", variant="primary")
  ❌ NEVER use ::ng-deep to override background-color, text-color, border-color, etc.

`::ng-deep` is ONLY permitted for structural overrides the component API cannot handle
(e.g., min-width, custom padding, custom border). Colors MUST always go through `variant`.

Examples:
  ✅ <ntv-button variant="accent">         — uses accent color from tailwind.config.js
  ❌ ::ng-deep button { @apply bg-accent-50 text-accent-main; }  — FORBIDDEN

This applies to ALL ntv-* components: button, dropdown, input, searchbar, table, etc.


<!-- NO INLINE STYLES — except data-driven bindings -->

// do not do this ❌
<div style="background: #E3FAE1; color: #0C2D0A;">

// do this ✅ — only for dynamic/data-driven values
<div [style.background]="card.iconBgColor" [style.color]="card.iconColor">

<!-- Static styles go in .scss. [style.*] bindings are only acceptable when
     the value is driven by component data at runtime. -->


<!-- ═══════════════════════════════════════════════════════════════════════════
     IMPORT ORGANIZATION (WARP Architecture)
════════════════════════════════════════════════════════════════════════════ -->

<!-- Group imports by source in a consistent order -->

import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

import axios from 'axios';
import express from 'express';
import { NtvButtonComponent } from '@ntv360/component-pantry';

import { AuthService } from '@core';
import { DashboardComponent } from '@features/dashboard';

<!-- Rules: -->
<!-- - Group imports: Angular → third party / NTV → local -->
<!-- - Section comments are optional -->
<!-- - Use path aliases (@core, @features, @shared, @layouts) for local imports -->
<!-- - For server files, use .js extension when required by the runtime -->


<!-- ═══════════════════════════════════════════════════════════════════════════
     1. CSS / SCSS ARCHITECTURE (WARP Standards)
════════════════════════════════════════════════════════════════════════════ -->

<!-- SASS (SCSS) — Required for all style files -->

// do not do this ❌

/* using plain CSS */
.card-header { background: #f0f0f0; }

/* using .scss but with deep nesting */
.parent {
  .child {
    .grandchild { color: red; }
  }
}

// do this ✅

/* Use .scss — nesting is fine up to 3 levels */
.card {
  &__header { background: #f0f0f0; }
  &__content { padding: 20px; }
  &__button {
    background: blue;
    &--disabled { opacity: 0.5; }
  }
}

/* Avoid nesting more than 3 levels deep */


<!-- BEM Naming Convention — REQUIRED -->

// do not do this ❌

/* Using flat semantic names */
.stat-card-header { ... }
.nav-item.active { ... }
.filter-toolbar-inner { ... }
.card-horizontal-content { ... }

// do this ✅

.stat-card {
  &__header { ... }
  &__header--active { ... }
  &__content { ... }
  &__button {
    &--primary { ... }
    &--disabled { ... }
  }
}

.navbar {
  &__menu { ... }
  &__menu__item--selected { ... }
}

.filter-toolbar {
  &__inner { ... }
  &__search { ... }
}

/* Block: main component (card, menu, button)
   Element: child of block, denoted by __ (card__title, menu__item)
   Modifier: variation, denoted by -- (button--primary, item--active) */


<!-- Tailwind CSS Integration — @apply over raw utility classes in HTML -->

// do not do this ❌

<button class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-700">Click Me</button>
<div class="flex items-center justify-between bg-white rounded-xl p-5">...</div>

// do this ✅

.button { @apply px-4 py-2 bg-blue-500 text-white rounded; }
.button:hover { @apply bg-blue-700; }

.filter-toolbar { @apply flex items-center justify-between bg-white rounded-xl; }
.filter-toolbar__inner { @apply p-5; }

/* Use @apply for Tailwind utilities in SCSS.
   Do not clutter HTML with extensive Tailwind utility classes.
   Mix @apply with raw CSS only for brand-specific values not in Tailwind. */


<!-- No Inline Styles — except data-driven bindings -->

// do not do this ❌

<div style="background: #E3FAE1; color: #0C2D0A;">...</div>

// do this ✅ — only for dynamic runtime values

<div [style.background]="card.iconBgColor" [style.color]="card.iconColor">...</div>

/* Static styles belong in SCSS. [style.*] is only for data-driven values. */


<!-- data-testid — required on all interactive elements -->

// do not do this ❌

<div class="card" data-testid="dashboard-card-wrapper">...</div>
<span data-testid="hosts-label-span">Host</span>

// do this ✅

<ntv-button data-testid="hosts-add-btn">...</ntv-button>
<app-table (actionClick)="onActionClick($event)" data-testid="hosts-table"></app-table>

/* Rules:
   - Add data-testid on every user-interactive component/element
   - Include interactive controls like buttons, dropdowns, breadcrumbs links, tables, and interactive table controls/columns
   - Do not add data-testid to passive wrappers, labels, spans, or layout containers
   - Use lowercase hyphenated names
   - Maximum 5 words per data-testid
*/


<!-- ═══════════════════════════════════════════════════════════════════════════
     2. DOCUMENTATION — JSDoc (Mandatory)
════════════════════════════════════════════════════════════════════════════ -->

// do not do this ❌

// calculates total price
function calculateTotal(subtotal, taxRate) {
  return subtotal * (1 + taxRate);
}

class DataService {
  getItems() { ... }
}

// do this ✅

/**
 * Calculates the total price of a cart including tax.
 *
 * @param {number} subtotal - The sum of item prices.
 * @param {number} taxRate - The tax rate as a decimal (e.g. 0.1 for 10%).
 * @returns {number} The total price formatted to 2 decimal places.
 * @throws {Error} If the subtotal is negative.
 *
 * @example
 * const total = calculateTotal(100, 0.2); // Returns 120
 */
function calculateTotal(subtotal: number, taxRate: number): number {
  if (subtotal < 0) throw new Error('Subtotal cannot be negative');
  return subtotal * (1 + taxRate);
}

/**
 * DataService handles fetching and caching of catalog items.
 */
class DataService {
  /**
   * Retrieves all items from the catalog.
   * @returns {Promise<Item[]>} Array of catalog items.
   */
  getItems(): Promise<Item[]> { ... }
}

/* Required for: all classes, methods, functions, interfaces.
   Must include: @param, @returns, @throws, @example where applicable. */


<!-- ═══════════════════════════════════════════════════════════════════════════
     3. TYPESCRIPT
════════════════════════════════════════════════════════════════════════════ -->

// do not do this ❌

let data: any = fetchSomething();
function getItem(id) { return store[id]; }
const userId = 'asdas123';

interface Config { [key: string]: any; }

// do this ✅

let data: unknown = fetchSomething();
function getItem(id: string): Item { return store[id]; }
const userId: string = 'asdas123';

interface Config { items: Item[]; mode: 'strict' | 'loose'; }

/* Rules:
   - strict: true must be enabled in tsconfig.json
   - No `any` — use unknown, define proper interfaces
   - Explicit return types on all functions
   - Use path aliases: @core, @shared, @features, @layouts
   - Path alias example: import { AuthService } from '@core'; */


<!-- ═══════════════════════════════════════════════════════════════════════════
     4. FILE STRUCTURE (WARP Architecture)
════════════════════════════════════════════════════════════════════════════ */

/*
Project Structure:

src/
├── app/
│   ├── core/        # Infrastructure (guards, services, models, constants)
│   ├── features/    # Business features (dashboard, pages, feature modules)
│   ├── layout/      # Layout shells (authenticated layout, public layout)
│   └── shared/      # Reusable components, directives, pipes
└── server/          # BFF Layer (Express middleware, config, services, types)

BFF Architecture:
  Browser → SSR Server (BFF) → Backend API
  - Hides backend URLs from browser
  - Centralized security & validation
  - SSR-safe authentication

Adding a new feature:
  1. Create in src/app/features/your-feature/
  2. Add routes in layout/*/routes.ts
  3. Use path aliases for imports
  4. Export via index.ts barrel

Authentication (SSR-safe pattern):
  - AuthService: manages auth state with Angular signals
  - authGuard: protects authenticated routes
  - guestGuard: protects public routes
  - Use isPlatformBrowser() checks for SSR compatibility
*/


<!-- ═══════════════════════════════════════════════════════════════════════════
     5. IMPORT ORGANIZATION (WARP — MANDATORY)
════════════════════════════════════════════════════════════════════════════ */

// do not do this ❌

import { Component } from '@angular/core';
import axios from 'axios';
import { AuthService } from '../../core/auth.service';
import { DashboardComponent } from '../dashboard/dashboard.component';

// do this ✅

import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

import axios from 'axios';
import express from 'express';
import { NtvButtonComponent } from '@ntv360/component-pantry';

import { AuthService } from '@core';
import { DashboardComponent } from '@features/dashboard';
import { MyComponent } from '@shared/components';
import { PublicComponent } from '@layouts/public';

/* Rules:
   - Group imports logically: Angular → third party / NTV → local
   - Section banners are optional; keep ordering consistent
   - Use path aliases (@core, @features, @shared, @layouts) for local imports
   - For server files use .js extension when required by the runtime */


<!-- ═══════════════════════════════════════════════════════════════════════════
     6. BOOTSTRAP GRID RULES
════════════════════════════════════════════════════════════════════════════ -->

// do not do this ❌

<div class="container">
  <div class="col-lg-12">
    <p>Content without a row parent</p>
  </div>
</div>

// do this ✅

<div class="container">
  <div class="row">
    <div class="col-lg-12">
      <p>Content wrapped in row</p>
      <div class="row">
        <div class="col-lg-8">...</div>
        <div class="col-lg-4">...</div>
      </div>
    </div>
  </div>
</div>

/* Every .col-* must have a .row parent.
   1 Level: row → col
   Nested: row → col → row → col */


<!-- ═══════════════════════════════════════════════════════════════════════════
     7. ACCESS MODIFIERS & NAMING
════════════════════════════════════════════════════════════════════════════ -->

// do not do this ❌

getTotalPlaylist() { ... }         // no access modifier
d_admin = new DealerAdmin();      // vague naming
userID = '123';                   // not camelCase
constructor(private _dealer: DealerService) { }  // legacy underscore prefix

// do this ✅

public getTotalPlaylist(): Playlist[] { ... }
@Input() playlistContents: Playlist[] = [];
dealerAdmin = new DealerAdmin();
userId = '123';
constructor(private dealerService: DealerService) { }

/* Rules:
   - Always declare access modifiers (public, private, protected)
   - @Input/@Output decorated variables: camelCase (playlistContents)
   - Regular variables: camelCase (dealerAdmin, userId)
   - Service variables: explicit readable names, no underscore requirement
   - Functions: camelCase, explicit return types
   - Group variables by access modifier then alphabetically:
     decorators → public → private → protected */


<!-- ═══════════════════════════════════════════════════════════════════════════
     8. CONSTANTS FILE — No Hardcoded Static Values
════════════════════════════════════════════════════════════════════════════ -->

// do not do this ❌

// component.html — hardcoded inline
<button class="theme-btn" (click)="playlistSettingClicked(edit)">
  <i class="fas fa-edit text-green mr-3"></i>
  <small class="font-weight-bold">Edit</small>
</button>

// do this ✅

// constants.ts
export const PLAYLIST_SETTING_BUTTONS = [
  { label: 'Edit',   action: PLAYLIST_SETTING_ACTIONS.edit,   icon: 'fas fa-edit' },
  { label: 'Clone',  action: PLAYLIST_SETTING_ACTIONS.clone,  icon: 'fas fa-copy' },
  { label: 'Push',  action: PLAYLIST_SETTING_ACTIONS.push,   icon: 'fas fa-upload' },
];

// component.ts
import { PLAYLIST_SETTING_BUTTONS } from './constants';
export class PlaylistComponent {
  playlistSettings = PLAYLIST_SETTING_BUTTONS;
}

// component.html
<button *ngFor="let p of playlistSettings" class="theme-btn" (click)="playlistSettingClicked(p.action)">
  <i class="{{ p.icon }}"></i>
  <small>{{ p.label }}</small>
</button>

/* Static texts, labels, icons go in constants files.
   Never hardcode visible strings in templates. */


<!-- ═══════════════════════════════════════════════════════════════════════════
     9. CLICK HANDLERS — Use <button> Not <span>
════════════════════════════════════════════════════════════════════════════ -->

// do not do this ❌

<span class="fas fa-times" (click)="delete()"></span>
<i class="fas fa-edit" (click)="edit()"></i>

// do this ✅

<button (click)="delete()" aria-label="Delete item">
  <span class="fas fa-times"></span>
</button>

/* If it is clickable and behaves like a button, wrap it in <button>.
     10. CHECKLIST
════════════════════════════════════════════════════════════════════════════ */

/*
Before submitting, ensure:

☐ Styles use SCSS with BEM naming convention
☐ @apply is used for Tailwind utilities in SCSS (not in HTML)
☐ All functions/methods have JSDoc comments
☐ Imports are organized: Angular → third party / NTV → local
☐ No `any` types — proper interfaces used throughout
☐ Path aliases used for local imports (@core, @shared, @features, @layouts)
☐ Access modifiers declared on all class members
☐ Static values extracted to constants files
☐ Clickable elements use <button> not <span>/<i>
☐ No inline styles on static elements
☐ SSR-safe patterns (isPlatformBrowser checks) where needed
☐ Code is formatted and linted
☐ Naming: simple short feature/class names only (no frame suffixes)
☐ HTML/SCSS BEM block names are short and feature-based
☐ Each component uses one primary BEM block matching the same short feature name as the component/file where possible
☐ State: signal() / computed() / inject() pattern used throughout
☐ data-testid exists on every user-interactive element/component
☐ data-testid names are lowercase hyphenated and 5 words max
☐ @if/@for control flow (not *ngIf/*ngFor)
☐ UI-only scope: no business logic/data-fetch/API functionality functions are added for page features
☐ No hard line-count limit is enforced
☐ Page structure is split into child components/tabs by section and interaction boundaries
☐ Static config/types are extracted into constants/interfaces
☐ Only minimal UI interaction handlers exist (no feature/business implementation)
☐ Table columns typed as TableColumn[] (not any[])
☐ Event types: explicit interfaces (not string | {})
☐ SCSS: 1200px + 768px responsive breakpoints
☐ No hardcoded hex colors in component code; static colors come from `tailwind.config.js` tokens
☐ Follow `SCAFFOLDING-REFERENCE.md` folder structure (`pages/<project-name>/` + sibling `constants/`, `interfaces/`, optional `components/`)
☐ Dummy/static config lives in `constants/` when extracted from the component
*/
