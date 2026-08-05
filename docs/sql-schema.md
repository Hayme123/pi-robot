# SQL schema

Supabase stores project metadata and job state. Cloudflare R2 stores project files, and Supabase Realtime replaces the custom project WebSocket feed.

## Data model

```text
auth.users
    |
    `--- public.profiles
             |
             `--< public.projects
                      |
                      `--< public.jobs
```

Three application tables are required. Supabase manages authentication in `auth.users`; `public.profiles` stores application-facing user data.

## `public.profiles`

One row stores application profile data for one Supabase user. Profile rows are not publicly readable.

```sql
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  check (btrim(first_name) <> ''),
  check (btrim(last_name) <> '')
);
```

| Field | Purpose |
| --- | --- |
| `id` | The matching `auth.users.id`; no second user identifier is created. |
| `first_name` | User's first name. |
| `last_name` | User's last name. |
| `created_at` | Profile creation time. |
| `updated_at` | Last profile update. |

The signup flow must create this profile before the user creates a project.

## `public.projects`

One row represents one generated application.

```sql
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles(id) on delete set null,
  name text not null unique,

  current_artifact_prefix text,

  preview_status text not null default 'stopped'
    check (preview_status in ('starting', 'ready', 'stopped', 'failed', 'expired')),
  preview_base_url text,
  preview_error text,
  preview_expires_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
```

| Field | Purpose |
| --- | --- |
| `id` | Stable project identifier used in relationships and R2 keys. |
| `owner_id` | User who created the project. It is attribution, not a read-access boundary. |
| `name` | User-facing project name, such as `landing-page`. |
| `current_artifact_prefix` | R2 prefix containing the current project source and file manifest. |
| `preview_status` | Current EC2 preview state. |
| `preview_base_url` | Active Nginx preview URL. |
| `preview_error` | Latest preview failure message. |
| `preview_expires_at` | Expected preview expiration. |
| `created_at` | Project creation time. |
| `updated_at` | Last project or preview update. |
| `deleted_at` | Soft-deletion timestamp; null means active. Deleted projects are renamed with a timestamp so the original name can be reused. |

## `public.jobs`

One row represents an initial generation or revision. Updating this row drives Supabase Realtime progress events.

```sql
create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,

  kind text not null
    check (kind in ('create', 'revision')),
  stage text not null default 'setup'
    check (stage in ('setup', 'html', 'angular', 'persist', 'preview')),
  status text not null default 'queued'
    check (status in ('queued', 'processing', 'completed', 'failed', 'cancelled')),

  request jsonb,
  progress jsonb not null default '{}'::jsonb,
  artifact_prefix text,
  summary text,
  error text,

  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

create unique index one_active_job_per_project
  on public.jobs (project_id)
  where status in ('queued', 'processing');

create index jobs_by_project_created_at
  on public.jobs (project_id, created_at desc);
```

| Field | Purpose |
| --- | --- |
| `id` | Job identifier, also used to version R2 artifacts. |
| `project_id` | Project being created or revised. |
| `kind` | Initial `create` operation or later `revision`. |
| `stage` | Current pipeline stage. |
| `status` | Durable job state. |
| `request` | Prompt, comments, Figma references, and thinking level. |
| `progress` | Per-stage status, cost, and timestamp data used by the existing frontend stage cards. |
| `artifact_prefix` | Immutable R2 output prefix produced by a successful job. |
| `summary` | Pi's completion summary. |
| `error` | Safe failure message. |
| `created_at` | Request acceptance time. |
| `started_at` | Processing start time. |
| `completed_at` | Completion, failure, or cancellation time. |
| `updated_at` | Last state change, used for Realtime ordering. |

## R2 object layout

R2 is the durable source of project files. Each project has one name-based prefix containing its latest complete folder archive and source manifest.

```text
projects/
`-- <project-name>/
    |-- workspace.zip
    `-- files.json
```

The application derives object keys from `artifact_prefix`:

```text
<prefix>/workspace.zip
<prefix>/files.json
```

`workspace.zip` contains the complete project folder, including Figma and revision assets, while excluding dependencies, builds, logs, and credentials. `projects.current_artifact_prefix` points to the active artifact set. When a project is soft-deleted, its R2 prefix is renamed with the project record. Signed R2 URLs and credentials are never stored in these tables.

## Job completion

After the generated project folder is uploaded to R2, one database transaction must:

1. Set `jobs.artifact_prefix`.
2. Mark the job `completed` and set its completion timestamps.
3. Set `projects.current_artifact_prefix` to the same prefix.
4. Update `projects.updated_at`.

If the R2 upload fails, the current project pointer remains unchanged and the job is marked `failed`.

## EC2 runtime lookup

No runtime table is required. Generation runs in the API container, and Fastify tracks active Angular preview processes in memory. Supabase remains authoritative for project and job state.

## Supabase Realtime

Publish only the two tables that drive project status:

```sql
alter publication supabase_realtime add table public.projects;
alter publication supabase_realtime add table public.jobs;
```

Clients subscribe to:

- `jobs` for generation and revision progress.
- `projects` for active artifact and preview changes.

Postgres remains the durable state. Clients subscribe first, fetch the current snapshot after the channel reports `SUBSCRIBED`, and fetch again after reconnecting.

## Row-level security

Enable RLS on all application tables. Profiles remain private, but projects and jobs are publicly readable by anonymous and authenticated clients. Client writes are not allowed; the authenticated signup flow and Fastify write with server credentials.

```sql
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.jobs enable row level security;

create policy "users can read their profile"
on public.profiles
for select
to authenticated
using (id = auth.uid());

create policy "projects are publicly readable"
on public.projects
for select
to anon, authenticated
using (true);

create policy "jobs are publicly readable"
on public.jobs
for select
to anon, authenticated
using (true);
```

## Removed state

The database and Realtime feed replace:

```text
status_setup.json
status_html.json
status_angular.json
status_revision.json
status_run.json
custom project WebSocket snapshots
in-memory project event subscriptions
```

Projects are publicly readable, but the R2 bucket remains private. Fastify issues short-lived access URLs, and generated folders exclude credentials, so public access does not expose storage credentials.
