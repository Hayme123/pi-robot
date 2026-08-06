# Pi Frontend Builder API

A minimal Fastify API that gives each generated frontend project its own Pi workspace and persistent session.

See the complete [text and ASCII architecture](docs/architecture.md).

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

R2 stores the complete project folder after each successful generation stage. Local folders are cache only: synced folders older than 24 hours are deleted daily and restored from the current `workspace.zip` when a later HTML, Angular, revision, or run request needs them.

For local development, install Cloudflared before starting the API. Each project preview gets its own Cloudflare Quick Tunnel:

```powershell
winget install --id Cloudflare.cloudflared
npm run dev
```

## Amazon Lightsail deployment

The deployment target is one Amazon Lightsail instance running the complete `pi-robot` Docker Compose stack. Pi generation and Angular previews run inside the API container; Modal is no longer part of the architecture.

Provision Docker and Compose, restrict the Lightsail firewall to SSH, then start the stack:

```bash
NPM_TOKEN=... docker compose up -d --build
```

R2 and Supabase remain the durable stores. Lightsail job workspaces are disposable. Each Angular preview gets its own Cloudflare Quick Tunnel; no Cloudflare token or inbound HTTP port is required.

## API

All endpoints except `/health` require `Authorization: Bearer $APP_API_KEY` when `APP_API_KEY` is configured.

Set up a project scaffold and download its Figma files:

```bash
curl -X POST http://localhost:3000/project \
  -H 'Content-Type: application/json' \
  -d '{"project_name":"landing-page","figma_url":"https://figma.com/...","figma_image_url":"https://figma.com/...","file_key":"FILE_KEY","node_ids":["1:2"]}'
```

Generate its HTML, CSS, and JavaScript after setup completes:

```bash
curl -X POST http://localhost:3000/project/landing-page/html
```

Generate its Angular application after HTML generation completes:

```bash
curl -X POST http://localhost:3000/project/landing-page/angular
```

Or queue project setup, HTML generation, Angular generation, and launch as one sequential pipeline:

```bash
curl -X POST http://localhost:3000/project/all \
  -H 'Content-Type: application/json' \
  -d '{"project_name":"landing-page","figma_url":"https://figma.com/...","figma_image_url":"https://figma.com/...","file_key":"FILE_KEY","node_ids":["1:2"]}'
```

Create and launch an Angular project from only a prompt. Pi chooses the project name:

```bash
curl -X POST http://localhost:3000/project/prompt \
  -H 'Content-Type: application/json' \
  -d '{"prompt":"Build a responsive expense dashboard for a small business"}'
# {"project_name":"small-business-expenses","status":"processing"}
```

Project metadata, preview state, and job progress are stored in Supabase. Set `SUPABASE_SECRET_KEY` to a server-only secret key with write access to `projects` and `jobs`.

Get project names and update timestamps, or one project with its available job statuses:

```bash
curl http://localhost:3000/projects
# {"projects":[{"project_name":"landing-page","updated_at":"..."}]}

curl http://localhost:3000/project/landing-page
# {"project_name":"landing-page","statuses":{"setup":{"status":"completed","updated_at":"..."}}}
```

Get a project's Angular files as a directory tree. Generated dependencies/builds, binary files, and `.env` are omitted:

```bash
curl http://localhost:3000/project/landing-page/files
# {"project_name":"landing-page","files":[{"name":"src","path":"src","type":"directory","children":[...]}]}
```

Run a generated Angular project through Cloudflare:

```bash
curl -X POST http://localhost:3000/project/PROJECT_NAME/run
# {"project_name":"PROJECT_NAME","url":"https://random-name.trycloudflare.com"}
```

The URL remains available while the Angular preview process is running.

Run every generated project with installed Angular dependencies in parallel:

```bash
curl -X POST http://localhost:3000/projects/run
# {"projects":[{"project_name":"landing-page","status":"running","url":"https://random-name.trycloudflare.com"}]}
```

Incomplete projects are returned as `skipped`; one launch failure does not stop the others.

## Security

Pi has shell and file-writing access inside the API container. Project jobs are not isolated from one another, so keep the API private, require authentication for mutations, and run this stack only on a dedicated Lightsail instance.
