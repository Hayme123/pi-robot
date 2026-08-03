# Cloud migration sprint plan

## Repositories in scope

```text
pi-robot   Fastify orchestration API and Modal worker code
robot-web  Angular 21.2 zoneless SSR application and Express BFF
```

The frontend is not a generic SPA. It currently has:

- An Angular SSR/BFF flow in `src/server.ts`.
- Direct browser `fetch()` calls to same-origin `/api` routes.
- A custom `ProjectEventsService` using `/ws/projects/:projectName`.
- A `ProjectsService` that converts filesystem status payloads into UI models.
- A same-origin preview proxy that injects `preview-inspector.js`.
- Placeholder session-storage authentication that is not wired into the active routes.

The migration must preserve the BFF and preview inspector while replacing their cloud-facing internals.

## Target architecture

```text
robot-web browser
  |-- Supabase Auth session
  |-- Supabase Realtime ---> projects + jobs
  |-- /api requests -------> robot-web Express BFF
  `-- /preview/:name -----> inspector preview proxy

robot-web Express BFF
  |-- serves public project reads and previews
  |-- validates Supabase sessions for mutations
  |-- forwards user JWT ---> pi-robot Fastify
  `-- proxies short-lived Modal preview responses

pi-robot Fastify
  |-- metadata/status -----> Supabase Postgres
  |-- project artifacts ---> Cloudflare R2
  `-- execution -----------> Modal Sandboxes
                               |-- job: Pi + Angular build
                               `-- preview: ng serve + Modal tunnel
```

There is no durable project storage on either application host. R2 is the file source of truth, Supabase is the metadata/status source of truth, and Modal filesystems are temporary.

## Delivery assumptions

- Two-week sprints.
- Projects, jobs, source manifests, downloads, and previews are readable by anyone.
- Supabase Auth is required only for creating or modifying projects.
- The Angular BFF remains; the browser does not call Fastify, R2, or Modal directly.
- Anonymous and authenticated browsers may connect directly to Supabase Realtime.
- Existing route URLs and UI domain models remain stable where practical.
- Existing local projects are migrated before local storage is removed.

---

## Sprint 1 — Authentication and cloud contracts

### Goal

Replace placeholder authentication and define contracts shared by both repositories.

### Infrastructure

- Create staging and production Supabase projects.
- Create private staging and production R2 buckets.
- Create least-privilege R2 credentials for Fastify only.
- Create and deploy the Modal App used by named sandboxes.
- Create Modal Secrets for model-provider credentials and the minimum Pi authentication payload.
- Separate staging and production secrets.

### `robot-web`

- Add `@supabase/supabase-js` and the SSR support required for cookie-backed sessions.
- Replace `AuthService` session-storage checks with the real Supabase session.
- Add first-name and last-name fields to signup and create the matching `public.profiles` row.
- Add the missing login implementation and wire existing auth/guest guards into `app.routes.ts`.
- Keep browser-only Supabase operations SSR-safe.
- Replace `/api/config`'s backend WebSocket origin response with safe public Supabase configuration, or use build-time public configuration.
- Add BFF middleware that validates the Supabase session only for project creation and revision requests.
- Keep project listing, detail, files, downloads, Realtime, and previews publicly accessible.
- Forward the user's access token from the BFF to Fastify for mutations.
- Update `HttpClientService` so optional authentication is supplied per request rather than stored globally.
- Add one browser API helper so `ProjectsService`, `PromptComposerComponent`, and `RunComponent` no longer duplicate request setup.
- Update the README's Angular version from 20 to the installed Angular 21.2 version.

### `pi-robot`

- Keep project read, file, download, and preview endpoints public.
- Validate Supabase JWTs on create, revision, run, and stop endpoints.
- Use the JWT subject as `owner_id`; never accept `owner_id` from request bodies.
- Add Supabase, R2, and Modal configuration with startup validation.
- Define deterministic R2 prefixes:

  ```text
  projects/<project-id>/jobs/<job-id>/workspace.zip
  projects/<project-id>/jobs/<job-id>/files.json
  projects/<project-id>/jobs/<job-id>/assets/
  ```

- Define deterministic Modal names:

  ```text
  job-<job-id>
  preview-<project-id>
  ```

- Extend create/revision responses without breaking existing fields:

  ```json
  {
    "project_id": "uuid",
    "project_name": "landing-page",
    "job_id": "uuid",
    "revision_id": "uuid",
    "status": "queued"
  }
  ```

  `revision_id` remains an alias of the revision job ID while the current frontend contract exists.

### Acceptance criteria

- A user signs up with first and last name, receives a profile row, and survives browser refresh and SSR navigation.
- Protected mutation requests reject missing, expired, and invalid sessions.
- Anonymous users can list, inspect, download, subscribe to, and preview every project.
- Authenticated users cannot modify projects they do not own.
- No service-role, R2, Modal, or provider credential enters the browser bundle.

---

## Sprint 2 — Supabase state and frontend Realtime adapter

### Goal

Replace filesystem status metadata while preserving the frontend's current signals and stage cards.

### Database

- Create only `profiles`, `projects`, and `jobs` as documented in `docs/sql-schema.md`.
- Link each profile directly to `auth.users.id` and each project to its profile.
- Use the `progress jsonb` field on `jobs` because the existing UI displays setup, HTML, Angular, revision, and run stage history from one pipeline.

  ```json
  {
    "setup": { "status": "completed", "cost": 0, "updated_at": "..." },
    "html": { "status": "completed", "cost": 0.12, "updated_at": "..." },
    "angular": { "status": "processing", "cost": 0, "updated_at": "..." }
  }
  ```

- Keep `stage` and `status` as the current coarse job state; use `progress` only for per-stage UI history.
- Add the one-active-job-per-project index.
- Enable RLS with public `SELECT` policies for `projects` and `jobs`; keep profiles private.
- Publish `projects` and `jobs` through `supabase_realtime`.
- Verify Realtime for anonymous and authenticated clients.

### `pi-robot`

- Add a Supabase repository for project/job operations.
- Replace status JSON writes with job `stage`, `status`, and `progress` updates.
- Store preview status on `projects`.
- Return project list/detail responses from Supabase.
- Keep old response shapes during the compatibility period by mapping rows into `statuses` server-side.
- Keep the existing Fastify WebSocket endpoint temporarily.

### `robot-web`

- Generate Supabase database types for `profiles`, `projects`, and `jobs`; do not hand-maintain raw row interfaces.
- Keep the existing UI types in `ProjectsService`:

  ```text
  ProjectSummary
  ProjectStage
  ProjectRevisionRequest
  ProjectEvent
  ```

- Add a small adapter from generated `projects`/`jobs` rows to those UI types.
- Change `ProjectEventsService` internally from native `WebSocket` to Supabase Realtime instead of rewriting `RunComponent`.
- Preserve its existing readonly signals (`projectStatus`, `angularStatus`, `latestEvent`, costs, timestamps, and connection status).
- Change `connect(projectName)` to connect using the returned `project_id`, with project name retained only for display/routing.
- Subscribe first, then load `/api/project/:name` after `SUBSCRIBED`.
- Re-fetch project state after Realtime reconnect.
- Map database states deliberately:

  ```text
  queued/processing -> in_progress
  completed         -> completed
  failed/cancelled  -> failed
  ```

- Update `ProjectEventsService` tests to drive Supabase row payloads rather than raw WebSocket strings.
- Keep `ProjectsService` as the source for HTTP snapshots, files, and revision commands.

### Acceptance criteria

- Existing dashboard and run-stage cards render without redesign.
- Realtime updates the current signals used by `RunComponent` for signed-in and anonymous visitors.
- Refresh and reconnect recover state from Supabase.
- No new status JSON files are written.
- The old WebSocket remains available only as a temporary fallback.

---

## Sprint 3 — R2 project storage

### Goal

Make R2 the only durable project file store while preserving the current code viewer and download behavior.

### `pi-robot`

- Add R2 upload, download, existence-check, and signed-URL operations.
- Store immutable outputs under the job ID.
- Archive `workspace.zip` without:

  ```text
  node_modules/
  .angular/
  dist/
  .env
  Pi credentials
  temporary logs
  ```

- Generate `files.json` in the same nested tree shape currently consumed by `parseProjectFilesResponse()`.
- Update `projects.current_artifact_prefix` only after required uploads succeed.
- Read `/project/:name/files` from R2 `files.json`.
- Make `/project/:name/download` return a short-lived signed R2 URL or redirect.
- Keep Figma and revision assets under the job's artifact prefix.
- Never mount the complete R2 bucket into an agent sandbox.

### `robot-web` BFF

- Preserve `/api/project/:projectName/files`; no component change should be required.
- Change the download route so it redirects to, or streams from, a signed R2 URL instead of buffering the full ZIP in Express.
- Allow public downloads while rate-limiting signed URL issuance.

### `robot-web` browser

- Simplify `RunComponent.downloadProject()` to navigate to the BFF download endpoint rather than fetching the full archive into a browser Blob.
- Keep the existing source-tree and code-comment UI unchanged.
- Request a new signed URL for every download; never persist one in signals or storage.

### Data migration utility

- Create an idempotent `pi-robot` command that:
  1. Reads each existing local project.
  2. Creates the owner/project/completed-job rows.
  3. Uploads `workspace.zip`, `files.json`, and assets.
  4. Sets `current_artifact_prefix` after verification.
  5. Writes a report without deleting local data.

### Acceptance criteria

- The dashboard, source viewer, revision code comments, and downloads work using only Supabase and R2.
- Fastify can start with an empty local filesystem.
- Failed uploads cannot replace the current artifact.
- Existing projects can be migrated repeatedly without duplicate active projects.

---

## Sprint 4 — Modal job sandboxes

### Goal

Run Pi and every agent-controlled command inside isolated Modal job sandboxes.

### Modal runtime image

- Build and publish a named image separately from sandbox creation.
- Include Node, Pi, Chromium, zip/unzip, Prettier, skills, safe Pi settings, and worker code.
- Bake Angular dependencies into `/opt/angular-deps` using build secrets for the private Pantry registry.
- Exclude `.env`, `.pi-agent/auth.json`, R2 credentials, Supabase service credentials, and Fastify credentials.
- Pin external image versions.

### `pi-robot` worker

- Add worker commands:

  ```text
  generate-html
  generate-angular
  generate-prompt
  apply-revision
  ```

- Move Pi session creation and tool execution from the Fastify process into the worker.
- Restore one project to `/workspace/app` and symlink image-baked dependencies.
- Emit one structured completion result containing summary and usage.
- Exit non-zero with a safe error message on failure.

### `pi-robot` orchestration

- Create `job-<job-id>` with explicit CPU, memory, command, and sandbox timeouts.
- Transfer only that job's inputs from R2.
- Run the worker and check its return code.
- Upload successful output to R2 before completing the Supabase job.
- Restrict outbound networking to verified model-provider domains.
- Treat an existing named job sandbox as a conflict.
- Terminate the sandbox in `finally`.

### `robot-web`

- No generation UI redesign.
- Update prompt and Figma queue flows to use returned `project_id` and `job_id` before starting Realtime.
- Remove the current pre-request WebSocket connection in `PromptComposerComponent.queue()`.
- Preserve optimistic revision cards, replacing `pending-<timestamp>` with the returned job ID as soon as the request succeeds.

### Acceptance criteria

- Pi, its bash tools, Angular builds, and Prettier execute only in Modal.
- A job cannot access another project's files or R2 objects.
- `PromptComposerComponent` and `RunComponent` display progress through Supabase Realtime.
- Failed jobs preserve the previous active artifact.

---

## Sprint 5 — Modal previews and inspector proxy

### Goal

Replace Cloudflare previews without losing the existing same-origin inspector and comment workflow.

### `pi-robot`

- Restore the current R2 artifact into `preview-<project-id>`.
- Run Angular on fixed port `4200`.
- Configure a Modal TCP readiness probe and encrypted tunnel.
- Store preview status, base URL, error, and expiration on `projects`.
- Add a public, rate-limited endpoint that creates a short-lived Modal Connect Token URL.
- Do not store or log connect tokens.
- Implement `/run` and `/stop` through deterministic Modal preview names.
- Replace the preview after a successful revision.
- Apply a maximum lifetime and reconcile expired previews.

### `robot-web` BFF

- Keep `/preview/:projectName`; it is required for `preview-inspector.js`, same-origin iframe access, Vite URL rewriting, and element comments.
- Change `PreviewProxyService.resolveRunUrl()` to request a fresh short-lived preview URL from Fastify.
- Remove its dependency on `/projects` filesystem statuses.
- Remove `__runUrl` from preview query strings.
- Remove the process-local `runUrls` map as authoritative state; any short cache must expire before the Modal token.
- Forward the preview response through the existing inspector injection path.
- Remove `Access-Control-Allow-Origin: *` unless a verified consumer requires it.

### `robot-web` browser

- Keep the iframe pointed at the same-origin `/preview/:projectName/` route.
- Simplify `buildPreviewPath()` to use only project name and an optional job/revision cache-buster.
- Replace `runUrl`-driven iframe state with `projects.preview_status` and `updated_at` from Realtime.
- Remove the five-second WebSocket URL delay; Modal readiness is authoritative.
- Preserve inspector selection, comments, source-line comments, and iframe message validation.
- Render starting, ready, failed, expired, and stopped preview states.

### Cleanup

- Remove `cloudflared`, local free-port allocation, child-process maps, and Cloudflare URL parsing from `pi-robot`.
- Do not remove the frontend preview proxy.

### Acceptance criteria

- Modal serves the preview while the robot-web BFF still injects the inspector.
- Element and code comments continue to create valid revision requests.
- The iframe never receives a durable Modal credential.
- Fastify and robot-web can both restart without losing preview metadata.

---

## Sprint 6 — Realtime cutover and production migration

### Goal

Remove compatibility paths, migrate existing data, and prove cloud recovery.

### `robot-web`

- Remove native WebSocket parsing, reconnect timers, `/api/config` WebSocket URL handling, and related tests.
- Keep `ProjectEventsService` only if its signal facade remains useful; otherwise rename it after consumers are migrated.
- Remove `runUrl`, `runRevisionId`, and `runUrlPending` state that existed only for Cloudflare/WebSocket coordination.
- Update `RunComponent` tests that currently mention WebSocket overlays and run URLs to use Supabase job/project updates.
- Add tests for anonymous Realtime, reconnect, preview expiration, public preview proxying, and signed downloads.
- Run `npm run build` in `robot-web` as the final Angular check.

### `pi-robot`

- Remove `/ws/projects/:projectName` and `src/services/project-events.ts`.
- Remove status JSON read/write and snapshot code.
- Remove durable `PROJECTS_ROOT` behavior after migration verification.
- Preserve the Compose `pi` service for local interactive tooling until it is intentionally replaced.

### Migration and operations

- Dry-run the local-project migration.
- Compare project counts, archive hashes, file manifests, and revision requests.
- Migrate production projects and keep local files read-only during the rollback window.
- Switch reads to Supabase/R2 and execution to Modal.
- Remove project volume mounts only after verification.
- Add stale-job, expired-preview, and orphan-artifact reconciliation.
- Add R2 lifecycle rules for abandoned failed-job artifacts.
- Add logs/metrics for project ID, job ID, stage, sandbox name, duration, cost, Modal startup, and R2 failures.
- Redact prompts where required and always redact signed URLs, connect tokens, and credentials.

### Acceptance criteria

- Existing users and projects are available through Supabase and R2.
- Neither repository requires durable local project files.
- The frontend uses Supabase Realtime exclusively for project progress.
- Horizontal replicas do not depend on in-memory job, WebSocket, preview, or file state.
- Restart, rollback, public-read RLS, cross-project sandbox isolation, and secret-exclusion checks pass.

---

## API compatibility summary

| Endpoint | Cloud behavior | `robot-web` impact |
| --- | --- | --- |
| `POST /project` | Create project/job and persist setup assets. | Existing BFF validation; consume IDs. |
| `POST /project/:name/html` | Run HTML worker in Modal. | No direct UI change. |
| `POST /project/:name/angular` | Run Angular worker in Modal. | No direct UI change. |
| `POST /project/all` | Run all stages in one job sandbox. | Prompt composer consumes project/job IDs. |
| `POST /project/prompt` | Create and generate in Modal. | Prompt composer consumes project/job IDs. |
| `POST /project/:name/revisions` | Restore R2 artifact and create a new job artifact. | Existing revision UI uses job ID. |
| `POST /project/:name/run` | Start/reuse Modal preview. | Status arrives through Realtime. |
| `POST /project/:name/stop` | Terminate named preview. | Existing action remains. |
| `GET /projects` | Read Supabase projects/jobs. | Adapter preserves `ProjectSummary`. |
| `GET /project/:name` | Read Supabase project/job history. | Adapter preserves revision cards. |
| `GET /project/:name/files` | Read current R2 `files.json`. | Existing source viewer remains. |
| `GET /project/:name/download` | Redirect to signed R2 download. | Stop buffering ZIP in browser/BFF. |
| `GET /project/:name/preview-url` | Create fresh Modal Connect Token URL. | Called by preview BFF only. |
| `/ws/projects/:name` | Removed after cutover. | Replaced inside `ProjectEventsService`. |
| `/preview/:name/*` | Continue proxying and injecting inspector. | Must remain. |

## Definition of done

Every sprint requires:

- Public-read RLS checks and authenticated mutation checks where data access changes.
- No credentials in browser bundles, logs, images, R2 artifacts, or generated ZIPs.
- Small tests for changed non-trivial behavior.
- Updated architecture, schema, API, and deployment documentation.
- Staging verification before production rollout.
- Granular Conventional Commits accepted by each repository's commitlint rules.
