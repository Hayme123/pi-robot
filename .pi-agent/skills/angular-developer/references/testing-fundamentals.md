# Testing Fundamentals

This guide covers the documentation and testing rules for Angular work. Use the test runner and configuration already established by the project.

## JSDoc

Document classes, interfaces, methods, and functions. Include only applicable tags: `@param`, `@returns`, `@throws`, and `@example`. Add useful context instead of repeating the identifier or TypeScript type.

```ts
/** Calculates a cart total including tax. */
export function calculateTotal(subtotal: number, taxRate: number): number {
  if (subtotal < 0) throw new Error('Subtotal cannot be negative');
  return subtotal * (1 + taxRate);
}
```

## Test selectors

- Add `data-testid` to interactive elements/components that tests operate.
- Do not add it to passive wrappers, labels, spans, or layout containers.
- Use lowercase hyphenated names with at most five words.

```html
<ntv-button data-testid="hosts-add-btn">Add host</ntv-button>
<ntv-table data-testid="hosts-table" (actionClick)="onActionClick($event)" />
```

## Required spec files

- Create a colocated `*.spec.ts` file for every generated or changed Angular component.
- Each spec must at least create the component and verify its initial render; add focused interaction coverage for any generated event handler or state change.
- Use the project's existing Angular test runner and the Act, Wait, Assert pattern below. Do not leave generated components without a spec.

## Completion checks

Before submitting Angular changes:

1. Format and lint changed files.
2. Run the smallest relevant tests.
3. Run `ng build` and fix build errors.
4. Verify strict typing and remove accidental `any`.
5. Check accessibility labels and semantic controls.
6. Check interactive `data-testid` values.
7. Verify responsive behavior at project breakpoints.
8. Confirm UI uses Pantry components where available and contains no duplicated business/API logic.

## Zoneless and async-first testing

For projects using zoneless testing, state changes schedule updates asynchronously. Use `await fixture.whenStable()` rather than manually forcing routine updates with `fixture.detectChanges()`.

Follow the **Act, Wait, Assert** pattern:

1.  **Act:** Update state or perform an action (e.g., set a component input, click a button).
2.  **Wait:** Use `await fixture.whenStable()` to allow the framework to process the scheduled update and render the changes.
3.  **Assert:** Verify the outcome.

### Basic Test Structure Example

```ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MyComponent } from './my.component';

describe('MyComponent', () => {
  let component: MyComponent;
  let fixture: ComponentFixture<MyComponent>;
  let h1: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({});

    // Create the component fixture
    fixture = TestBed.createComponent(MyComponent);
    component = fixture.componentInstance;
    h1 = fixture.nativeElement.querySelector('h1');
  });

  it('should display the default title', async () => {
    // ACT: (Implicit) Component is created with default state.
    // WAIT for initial data binding.
    await fixture.whenStable();
    // ASSERT the initial state.
    expect(h1.textContent).toContain('Default Title');
  });

  it('should display a different title after a change', async () => {
    // ACT: Change the component's title property.
    component.title.set('New Test Title');

    // WAIT for the asynchronous update to complete.
    await fixture.whenStable();

    // ASSERT the DOM has been updated.
    expect(h1.textContent).toContain('New Test Title');
  });
});
```

## TestBed and ComponentFixture

- **`TestBed`**: The primary utility for creating a test-specific Angular module. Use `TestBed.configureTestingModule({...})` in your `beforeEach` to declare components, provide services, and set up imports needed for your test.
- **`ComponentFixture`**: A handle on the created component instance and its environment.
  - `fixture.componentInstance`: Access the component's class instance.
  - `fixture.nativeElement`: Access the component's root DOM element.
  - `fixture.debugElement`: An Angular-specific wrapper around the `nativeElement` that provides safer, platform-agnostic ways to query the DOM (e.g., `debugElement.query(By.css('p'))`).
