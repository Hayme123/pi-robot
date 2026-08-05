# System architecture

The service is a filesystem-backed frontend generation pipeline. Fastify accepts work, Pi agents generate code, and Nginx exposes the API and Angular previews from Amazon EC2.

## Component diagram

```text
External services: Figma, Font Awesome, OpenAI/Codex
                         |
                         v
API client or frontend --HTTPS--> Nginx (EC2, ports 80/443)
                                   |-- /api/* ----------------> Fastify :3000
                                   `-- /previews/<port>/* ----> api:<port> (Angular)
                                                                  |
Fastify ----------------------------------------------------------+
  |-- project routes and background orchestration
  |-- Supabase status + Realtime
  |-- R2 project artifacts
  `-- Pi SDK + Angular build in the API container
```

The Compose `pi` service uses the same image, projects volume, and `.pi-agent` volume to provide an interactive Pi CLI beside the API service.

## Full Figma-to-Angular pipeline

`POST /project/all` queues the following sequential background job and immediately returns HTTP `202`:

```text
Request
  | project_name, file_key, node_ids
  v
[1. SETUP]
  |-- create projects/<project_name>/
  |-- extract scaffolds/frontend-scaffold.zip
  |     `-> projects/<project_name>/<project_name>/
  |-- for each Figma node
  |     |-- fetch node JSON
  |     |-- download PNG (scale fallback: 2 -> 1 -> 0.5)
  |     |-- remove hidden/off-canvas/noisy Figma data
  |     `-- resolve named Font Awesome icons into svg/
  `-- status_setup.json
          |
          v
[2. STATIC HTML]
  |-- flatten cleaned Figma data -> design_spec.json
  |-- Pi session (high reasoning + html skill)
  |     inputs: design spec + frame PNG + SVG directory
  |     output: project-level index.html and styles.css
  `-- status_html.json (usage, cost, output_html)
          |
          v
[3. ANGULAR]
  |-- link the image-baked Angular node_modules into the workspace
  |-- combine extracted icons + default brand symbols
  |     `-> src/assets/icons/icons-sprite.svg
  |-- Pi session (high reasoning + angular-developer skill)
  |     inputs: generated HTML + frame PNG + icon sprite
  |     output: edited Angular application + successful build
  |-- backend runs project-local Prettier on src/
  `-- status_angular.json (usage and cost)
          |
          v
[4. RUN]
  |-- start Angular: ng serve --host 0.0.0.0 --port <4200-4299> --allowed-hosts
  |-- wait until any HTTP response proves readiness
  |-- publish /previews/<allocated-port>/ through Nginx
  `-- status_run.json (stable HTTPS URL)
          |
          v
Public Angular preview
```

A failure stops the sequence and marks the active stage `failed`. Completed earlier stages remain on disk.

## Prompt-only pipeline

`POST /project/prompt` lets Pi select an unused kebab-case project name, then runs:

```text
User prompt
    |
    v
Pi names project -> extract Angular scaffold -> link shared dependencies
    -> Pi builds Angular directly from prompt -> Prettier
    -> Angular preview process -> Nginx route -> public URL

Status files: setup -> angular -> run
Skipped stage: html (there is no Figma/HTML reference)
```

## Individually triggered stages

```text
POST /project
    -> scaffold + Figma assets

POST /project/:name/html
    -> existing Figma assets -> static HTML

POST /project/:name/angular
    -> existing HTML + image + scaffold -> Angular

POST /project/:name/run
    -> existing installed Angular workspace -> Angular preview process -> Nginx

POST /projects/run
    -> launch all installed Angular workspaces concurrently; isolate failures

POST /project/:name/stop
    -> terminate its Angular preview process
```

These endpoints support manual orchestration of the same stages used by `/project/all`.

## Revision pipeline

```text
POST /project/:name/revisions
  | prompt + comments + thinking_level
  v
Validate request and create revision UUID
  |
  |-- comments with figma_frame
  |     `-> download each frame into .revision-assets/<revision-id>/
  |
  v
Fresh Pi agent session
  |-- create a new session for every revision
  |-- apply comments to the existing Angular workspace
  `-- build and return a change summary
  |
  v
status_revision.json (revision history)
  |
  v
restart Angular and refresh its Nginx URL
  |
  v
status_run.json (revision UUID + refreshed URL)
```

## Status and observability flow

Background stages update `jobs.stage`, `jobs.status`, and `jobs.progress`. Generation is marked complete before the subsequent `persist` stage archives and uploads its artifacts. Preview state is stored on `projects`. HTTP snapshots come from Supabase, and clients receive subsequent changes through Supabase Realtime.

## Project filesystem

```text
projects/
`-- <project-name>/
    |-- frame.png
    |-- frame_data_clean.json
    |-- design_spec.json
    |-- index.html
    |-- styles.css
    |-- svg/
    |-- .revision-assets/
    |-- status_setup.json
    |-- status_html.json
    |-- status_angular.json
    |-- status_revision.json
    |-- status_run.json
    `-- <project-name>/             Angular workspace
        |-- angular.json
        |-- src/
        |-- node_modules/
        `-- ...
```

`GET /project/:name/files` omits dependencies, build output, binary files, and `.env`. `GET /project/:name/download` streams a ZIP with the same generated/build directories excluded.

## Planned Amazon EC2 deployment boundary

```text
Amazon EC2 instance
+----------------------------------------------------------------+
| Docker Compose                                                  |
|                                                                |
|  api container                         pi container             |
|  Fastify orchestration                 interactive Pi CLI       |
|         |                                                      |
|         +--> Pi generation in project-specific workspaces      |
|         `--> Angular preview processes on ports 4200-4299      |
|  nginx container: ingress for API and /previews/*               |
|                                                                |
|  temporary workspaces <--------------> R2 artifacts             |
+----------------------------------------------------------------+
```

The Docker image installs the scaffold lockfile once at `/opt/angular-deps`; generated projects symlink their `node_modules` to that immutable image directory. Existing per-project dependencies are reused, and non-Docker development falls back to a local npm install.

Each Pi session receives a project-specific working directory inside the API container, but jobs are not isolated from one another. Run the stack only on a dedicated EC2 instance, expose only Nginx, require authentication for mutations, and never place host credentials in generated workspaces or R2 archives.
