---
name: jsdoc
description: Adds, completes, or reviews properly formatted JSDoc for JavaScript and TypeScript code. Use when asked to document code, add JSDoc, document functions/classes/modules, or improve API documentation.
---

# JSDoc

Add accurate JSDoc to JavaScript and TypeScript code without changing runtime behavior.

## Workflow

1. Read every file being documented and trace each public API's callers when needed to understand its behavior.
2. Document exported functions, classes, methods, route handlers/plugins, and non-obvious internal helpers. Do not add comments to trivial constants, imports, or self-explanatory one-line code.
3. Preserve existing correct documentation; improve it instead of duplicating it.
4. Run the smallest relevant typecheck, test, or build after edits.

## Required format

Use a complete multiline block immediately above the declaration:

```js
/**
 * Calculates the employee's total working hours, excluding lunch.
 *
 * @param {Date} timeIn - The employee's clock-in time.
 * @param {Date} timeOut - The employee's clock-out time.
 * @param {number} lunchMinutes - Lunch duration in minutes.
 * @returns {number} Total working hours.
 * @throws {RangeError} If the clock-out time is earlier than the clock-in time.
 *
 * @example
 * const hours = calculateWorkingHours(
 *   new Date('2026-07-20T08:32:00'),
 *   new Date('2026-07-20T17:21:00'),
 *   49
 * );
 *
 * console.log(hours); // 8
 */
```

- Start with a precise third-person summary ending in a period.
- Use `@param {Type} name - Description.` for every parameter, including options and callbacks.
- Use `@returns {Type} Description.` for every non-void return value. Use `@returns {Promise<Type>} ...` for async functions.
- Use `@throws {ErrorType} Description.` only for errors the function deliberately throws or propagates as part of its API.
- Add one realistic `@example` for exported or non-obvious APIs. Keep examples runnable and aligned with the actual signature.
- Use `@type {Type}` for documented constants/configuration objects when useful.
- In TypeScript, keep JSDoc types consistent with the TypeScript signature; do not invent types or claim runtime validation that does not exist.
- Omit tags that do not apply. Do not add fake `@throws`, empty descriptions, or examples that cannot work.

## Route handlers

Document route plugins and handlers by stating the HTTP method, path, request body/query/params, response, and notable status codes. Example:

```ts
/**
 * Creates a project from the frontend scaffold archive.
 *
 * @param {FastifyRequest} request - Request containing the project name.
 * @param {FastifyReply} reply - Reply used to send the project result.
 * @returns {Promise<{ project_name: string }>} Created project name.
 * @throws {Error} If scaffold extraction fails.
 *
 * @example
 * await app.inject({
 *   method: 'POST',
 *   url: '/project',
 *   payload: { project_name: 'marketing-site' },
 * });
 */
```

Keep comments truthful, concise, and close to the code they describe.
