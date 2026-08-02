# System architecture

The service is a filesystem-backed frontend generation pipeline. Fastify accepts work, Pi agents generate code, and Angular's development server is exposed through a temporary Cloudflare tunnel.

## Component diagram

```text
                                      External services
                         +---------------------------------------+
                         | Figma API        Font Awesome API     |
                         | OpenAI/Codex      Cloudflare Tunnel   |
                         +----+----------------+--------------+--+
                              |                |              |
                              v                v              ^
+-------------+ HTTP / WS +--------------------------------------------------+
| API client  |---------->| Fastify API (api container, port 3000)            |
| or frontend |<----------|                                                    |
+-------------+           |  +------------------+   +-----------------------+ |
                          |  | Project routes   |-->| Background pipeline   | |
                          |  | health / files   |   | setup -> html ->      | |
                          |  | status / zip     |   | angular -> run        | |
                          |  | revisions / run  |   +-----------+-----------+ |
                          |  +--------+---------+               |             |
                          |           |                         v             |
                          |  +--------v---------+   +-----------------------+ |
                          |  | Status/event bus |   | Pi Coding Agent SDK   | |
                          |  | JSON files + WS  |   | gpt-5.6-luna         | |
                          |  +--------+---------+   | project-local skills  | |
                          |           |             +-----------+-----------+ |
                          |           v                         |             |
                          |  /workspace/projects/<project>/     | edits       |
                          |  +-------------------------------+  v             |
                          |  | Figma assets, generated HTML  |                |
                          |  | status_*.json                 |                |
                          |  | <project>/ Angular workspace |                |
                          |  +-------------------------------+                |
                          |                     |                              |
                          |                     v                              |
                          |  Angular dev server (free local port)             |
                          |                     |                              |
                          |                     v                              |
                          |  cloudflared --------------------------------------+
                          +--------------------------------------------------+
                                                |
                                                v
                                 https://*.trycloudflare.com
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
  |-- npm install in the extracted Angular workspace
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
  |-- allocate a free loopback port
  |-- start: ng serve --host 127.0.0.1 --allowed-hosts
  |-- wait until any HTTP response proves readiness
  |-- start Cloudflare Quick Tunnel to the Angular port
  |-- capture https://*.trycloudflare.com
  `-- status_run.json (public URL)
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
Pi names project -> extract Angular scaffold -> npm install
    -> Pi builds Angular directly from prompt -> Prettier
    -> Angular dev server -> Cloudflare tunnel -> public URL

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
    -> existing installed Angular workspace -> public tunnel

POST /projects/run
    -> launch all installed Angular workspaces concurrently; isolate failures

POST /project/:name/stop
    -> terminate its Angular and cloudflared processes
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
Pi agent session
  |-- reuse recent project session when context usage <= 30%
  |-- otherwise create a fresh session
  |-- apply comments to the existing Angular workspace
  `-- build and return a change summary
  |
  v
status_revision.json (revision history)
  |
  v
restart Angular + Cloudflare processes
  |
  v
status_run.json (revision UUID + refreshed URL)
```

## Status and observability flow

```text
Background stage
    |
    +-- write status_<stage>.json
    |      processing | completed | failed
    |      timestamp, error, URL, model usage/cost as applicable
    |
    `-- publish in-memory event
             |
             v
       WebSocket subscribers
       /ws/projects/:projectName
```

A new WebSocket subscriber first receives snapshots from saved status files, then live in-memory events. `GET /projects` and `GET /project/:name` read the same files, so the filesystem is the source of truth across API restarts. Running process state and WebSocket subscriptions are in memory and do not survive restarts.

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

## Deployment boundary

```text
Host
+----------------------------------------------------------------+
| ./projects <---------- volume ----------> /workspace/projects   |
| ./.pi-agent <--------- volume ----------> /workspace/.pi-agent  |
|                                                                |
|  api container                         pi container             |
|  Fastify + Pi SDK                      interactive Pi CLI       |
|  Angular child processes                                        |
|  cloudflared child processes                                    |
+----------------------------------------------------------------+
```

Each Pi session receives a project-specific working directory, but this is not a security sandbox. Production isolation must place generated projects and agent execution behind filesystem, process, network, CPU, and memory limits.
