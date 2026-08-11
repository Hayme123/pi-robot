import { randomUUID } from "node:crypto";
import { config } from "../config.js";

export type JobStatus = {
  status: "queued" | "processing" | "completed" | "failed";
  revision_id?: string;
  cost?: number;
  context_length?: number | null;
  context_window?: number | null;
  context_percent?: number | null;
  summary?: string;
  output_html?: string;
  url?: string;
  error?: string;
};

export type ProjectStage = "setup" | "html" | "angular" | "persist" | "revision" | "run";

type JobRow = {
  id: string;
  project_id: string;
  kind: "create" | "revision";
  stage: string;
  status: "queued" | "processing" | "completed" | "failed";
  request: Record<string, unknown> | null;
  progress: Record<string, unknown>;
  summary: string | null;
  error: string | null;
  created_at: string;
  started_at: string | null;
  updated_at: string;
  created_by: string | null;
};

export type ResponsibleUser = { id: string; name: string; department: string | null };
export type ClaimedRevisionJob = Pick<JobRow, "id" | "project_id" | "request">;

type ProfileRow = {
  id: string;
  first_name: string;
  last_name: string;
  department: string | null;
};

type ProjectRow = {
  id: string;
  owner_id: string | null;
  name: string;
  created_at: string;
  current_artifact_prefix?: string | null;
  preview_status: "starting" | "ready" | "stopped" | "failed" | "expired";
  preview_base_url: string | null;
  preview_error: string | null;
  preview_expires_at: string | null;
  local_expires_at?: string | null;
  deleted_at?: string | null;
  updated_at: string;
  jobs?: JobRow[];
};

const stageNames: Record<ProjectStage, string> = {
  setup: "setup",
  html: "html",
  angular: "angular",
  persist: "persist",
  revision: "angular",
  run: "preview",
};

async function query<T>(resource: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${config.supabase.url}/rest/v1/${resource}`, {
    ...init,
    headers: {
      apikey: config.supabase.secretKey,
      authorization: `Bearer ${config.supabase.secretKey}`,
      "content-type": "application/json",
      ...init?.headers,
    },
  });
  const body = await response.text();
  if (!response.ok) throw new Error(`Supabase ${response.status}: ${body}`);
  return (body ? JSON.parse(body) : undefined) as T;
}

/**
 * Creates a project and its initial job in Supabase.
 *
 * @param {string} name - Unique project name.
 * @param {string} ownerId - Authenticated owner identifier.
 * @param {Record<string, unknown>} request - Original creation request.
 * @returns {Promise<{ projectId: string; jobId: string }>} Created identifiers.
 *
 * @example
 * await createProject("marketing-site", "user-id");
 */
export async function createProject(name: string, ownerId: string, request?: Record<string, unknown>): Promise<{ projectId: string; jobId: string }> {
  const projectId = randomUUID();
  const jobId = randomUUID();
  await query("projects", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ id: projectId, owner_id: ownerId, name }),
  });
  try {
    await query("jobs", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ id: jobId, project_id: projectId, kind: "create", created_by: ownerId, request: request ?? null }),
    });
  } catch (error) {
    await query(`projects?id=eq.${projectId}`, { method: "DELETE" });
    throw error;
  }
  return { projectId, jobId };
}

/**
 * Creates a revision job for an existing project.
 *
 * @param {string} projectName - Project name.
 * @param {string} jobId - Revision job identifier.
 * @param {Record<string, unknown>} request - Revision request.
 * @param {string} createdBy - Authenticated user identifier.
 * @returns {Promise<{ projectId: string; status: "processing" | "queued"; createdAt: string; updatedAt: string; createdBy: ResponsibleUser }>} Revision metadata.
 *
 * @example
 * await createRevisionJob("marketing-site", "revision-id", { comments: [] }, "user-id");
 */
export async function createRevisionJob(
  projectName: string,
  jobId: string,
  request: Record<string, unknown>,
  createdBy: string,
): Promise<{ projectId: string; status: "processing" | "queued"; createdAt: string; updatedAt: string; createdBy: ResponsibleUser }> {
  const project = await getProjectRow(projectName);
  const active = await query<Pick<JobRow, "id">[]>(`jobs?select=id&project_id=eq.${project.id}&kind=eq.revision&status=in.(processing,queued)&limit=1`);
  const status = active.length ? "queued" : "processing";
  const profile = (await getProfiles([createdBy])).get(createdBy);
  const createdByUser = creator(createdBy, new Map(profile ? [[createdBy, profile]] : [])) ?? { id: createdBy, name: createdBy, department: null };
  const rows = await query<JobRow[]>("jobs", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      id: jobId,
      project_id: project.id,
      kind: "revision",
      stage: "angular",
      status,
      created_by: createdBy,
      request,
      progress: { revision: { created_by: createdByUser } },
    }),
  });
  const job = rows[0];
  if (!job) throw new Error("Revision job was not created");
  return { projectId: project.id, status, createdAt: job.created_at, updatedAt: job.updated_at, createdBy: createdByUser };
}

/** Atomically claims the oldest queued revision when a project has no active revision. */
export async function claimQueuedRevision(projectId: string): Promise<ClaimedRevisionJob | null> {
  const active = await query<Pick<JobRow, "id">[]>(`jobs?select=id&project_id=eq.${projectId}&kind=eq.revision&status=eq.processing&limit=1`);
  if (active.length) return null;
  const queued = await query<ClaimedRevisionJob[]>(`jobs?select=id,project_id,request&project_id=eq.${projectId}&kind=eq.revision&status=eq.queued&order=created_at.asc,id.asc&limit=1`);
  const job = queued[0];
  if (!job) return null;
  const now = new Date().toISOString();
  const claimed = await query<ClaimedRevisionJob[]>(`jobs?id=eq.${job.id}&status=eq.queued`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ status: "processing", stage: "angular", started_at: now, completed_at: null, updated_at: now }),
  });
  return claimed[0] ?? null;
}

/** Lists projects that have queued revisions so a worker can recover them at startup. */
export async function listQueuedRevisionProjects(): Promise<Array<{ projectId: string; projectName: string }>> {
  const rows = await query<Array<{ project_id: string; projects: { name: string } | null }>>("jobs?select=project_id,projects!inner(name)&kind=eq.revision&status=eq.queued");
  return [...new Map(rows.flatMap((row) => row.projects ? [[row.project_id, row.projects.name] as const] : [])).entries()]
    .map(([projectId, projectName]) => ({ projectId, projectName }));
}

/**
 * Updates a project's job progress for one pipeline stage.
 *
 * @param {string} projectName - Project name.
 * @param {ProjectStage} stage - Pipeline stage to update.
 * @param {JobStatus} status - Current stage status.
 * @returns {Promise<void>} Resolves after Supabase persists the update.
 *
 * @example
 * await updateJobStatus("marketing-site", "angular", { status: "processing" });
 */
export async function updateJobStatus(projectName: string, stage: ProjectStage, status: JobStatus): Promise<void> {
  const job = await getJob(projectName, status.revision_id);
  const updatedAt = new Date().toISOString();
  const { revision_id: _revisionId, url: _url, ...stageStatus } = status;
  const progress = { ...(job.progress ?? {}), [stage]: { ...stageStatus, updated_at: updatedAt } };
  await query(`jobs?id=eq.${job.id}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      stage: stageNames[stage],
      status: status.status,
      progress,
      ...(status.summary !== undefined ? { summary: status.summary } : {}),
      error: status.error ?? null,
      ...(status.status === "processing" ? { completed_at: null, ...(!job.started_at ? { started_at: updatedAt } : {}) } : { completed_at: updatedAt }),
      updated_at: updatedAt,
    }),
  });
}

/**
 * Updates a project's preview state.
 *
 * @param {string} projectName - Project name.
 * @param {JobStatus} status - Preview status and optional URL or error.
 * @returns {Promise<void>} Resolves after Supabase persists the preview state.
 *
 * @example
 * await updatePreview("marketing-site", { status: "completed", url: "https://random-name.trycloudflare.com" });
 */
export async function updatePreview(projectName: string, status: JobStatus): Promise<void> {
  const updatedAt = new Date().toISOString();
  const previewStatus = status.status === "processing" ? "starting" : status.status === "completed" ? "ready" : "failed";
  await query(`projects?name=eq.${encodeURIComponent(projectName)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      preview_status: previewStatus,
      preview_base_url: status.url ?? null,
      preview_error: status.error ?? null,
      preview_expires_at: status.status === "completed" ? hourCeiling(1).toISOString() : null,
      updated_at: updatedAt,
    }),
  });
}

/**
 * Marks one project's preview as stopped and clears its URL.
 *
 * @param {string} projectName - Project name.
 * @returns {Promise<void>} Resolves after Supabase clears the preview.
 *
 * @example
 * await stopPreview("marketing-site");
 */
export async function stopPreview(projectName: string): Promise<void> {
  await query(`projects?name=eq.${encodeURIComponent(projectName)}&deleted_at=is.null`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ preview_status: "stopped", preview_base_url: null, preview_error: null, preview_expires_at: null, updated_at: new Date().toISOString() }),
  });
}

/** Soft-deletes a project after freeing its original name for reuse. */
export async function softDeleteProject(projectName: string, renamedProjectName: string, artifactRenamed: boolean): Promise<string | null> {
  const deletedAt = new Date().toISOString();
  const rows = await query<{ name: string }[]>(`projects?name=eq.${encodeURIComponent(projectName)}&deleted_at=is.null`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ name: renamedProjectName, deleted_at: deletedAt, ...(artifactRenamed ? { current_artifact_prefix: `projects/${renamedProjectName}` } : {}), preview_status: "stopped", preview_base_url: null, preview_error: null, preview_expires_at: null, updated_at: deletedAt }),
  });
  return rows[0]?.name ?? null;
}

/**
 * Clears active preview records left behind by a restarted API process.
 *
 * @returns {Promise<void>} Resolves after active preview records are stopped.
 *
 * @example
 * await stopActivePreviews();
 */
export async function stopActivePreviews(): Promise<void> {
  await query("projects?preview_status=in.(starting,ready)", {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ preview_status: "stopped", preview_base_url: null, preview_error: null, preview_expires_at: null, updated_at: new Date().toISOString() }),
  });
}

/** Stops previews whose expiration time has passed. */
export async function stopExpiredPreviews(): Promise<string[]> {
  const rows = await query<{ name: string }[]>(`projects?preview_status=in.(starting,ready)&preview_expires_at=lt.${encodeURIComponent(new Date().toISOString())}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ preview_status: "stopped", preview_base_url: null, preview_error: null, preview_expires_at: null, updated_at: new Date().toISOString() }),
  });
  return rows.map((row) => row.name);
}

/**
 * Retrieves the current artifact metadata for a project.
 *
 * @param {string} projectName - Project name.
 * @returns {Promise<{ projectId: string; currentArtifactPrefix: string | null } | null>} Artifact metadata, or null when absent.
 *
 * @example
 * await getProjectArtifact("marketing-site");
 */
/** Renews a project's local workspace lease for at least 24 hours. */
export async function renewLocalExpiry(projectName: string): Promise<void> {
  await query(`projects?name=eq.${encodeURIComponent(projectName)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ local_expires_at: hourCeiling(24).toISOString(), updated_at: new Date().toISOString() }),
  });
}

/** Retrieves the expiration and artifact state required by internal cleanup. */
export async function getProjectExpiry(projectName: string): Promise<Pick<ProjectRow, "name" | "preview_expires_at" | "local_expires_at" | "current_artifact_prefix"> | null> {
  const rows = await query<Pick<ProjectRow, "name" | "preview_expires_at" | "local_expires_at" | "current_artifact_prefix">[]>(`projects?select=name,preview_expires_at,local_expires_at,current_artifact_prefix&name=eq.${encodeURIComponent(projectName)}&deleted_at=is.null&limit=1`);
  return rows[0] ?? null;
}

/** Clears a project's local workspace expiration after its cache is deleted. */
export async function clearLocalExpiry(projectName: string): Promise<void> {
  await query(`projects?name=eq.${encodeURIComponent(projectName)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ local_expires_at: null, updated_at: new Date().toISOString() }),
  });
}

export async function getProjectArtifact(projectName: string): Promise<{ projectId: string; currentArtifactPrefix: string | null } | null> {
  const rows = await query<ProjectRow[]>(`projects?select=id,current_artifact_prefix&name=eq.${encodeURIComponent(projectName)}&limit=1`);
  return rows[0] ? { projectId: rows[0].id, currentArtifactPrefix: rows[0].current_artifact_prefix ?? null } : null;
}

/**
 * Retrieves a project's current artifact job.
 *
 * @param {string} projectName - Project name.
 * @returns {Promise<{ projectId: string; jobId: string }>} Project and job identifiers.
 *
 * @example
 * await getArtifactJob("marketing-site");
 */
export async function getArtifactJob(projectName: string): Promise<{ projectId: string; jobId: string }> {
  const project = await getProjectRow(projectName);
  const job = await getJob(projectName);
  return { projectId: project.id, jobId: job.id };
}

/**
 * Records the artifact prefix produced by a completed job.
 *
 * @param {string} projectName - Project name.
 * @param {string} jobId - Completed job identifier.
 * @param {string} artifactPrefix - R2 artifact prefix.
 * @returns {Promise<void>} Resolves after both records are updated.
 *
 * @example
 * await completeArtifact("marketing-site", "job-id", "projects/marketing-site");
 */
export async function completeArtifact(projectName: string, jobId: string, artifactPrefix: string): Promise<void> {
  const updatedAt = new Date().toISOString();
  await query(`jobs?id=eq.${jobId}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ artifact_prefix: artifactPrefix, updated_at: updatedAt }),
  });
  await query(`projects?name=eq.${encodeURIComponent(projectName)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ current_artifact_prefix: artifactPrefix, local_expires_at: hourCeiling(24).toISOString(), updated_at: updatedAt }),
  });
}

/**
 * Lists projects with compatibility status data.
 *
 * @returns {Promise<ReturnType<typeof mapProject>[]>} Mapped projects.
 *
 * @example
 * await listProjects();
 */
export async function listProjects(): Promise<ReturnType<typeof mapProject>[]> {
  const rows = await query<ProjectRow[]>("projects?select=*,jobs(*)&deleted_at=is.null&order=name.asc&jobs.order=created_at.asc,id.asc");
  const profiles = await getProfiles(rows.flatMap((project) => [project.owner_id, ...(project.jobs ?? []).map((job) => job.created_by)]));
  return rows.map((project) => mapProject(project, profiles));
}

/**
 * Retrieves one project with compatibility status data.
 *
 * @param {string} projectName - Project name.
 * @returns {Promise<ReturnType<typeof mapProject> | null>} Mapped project, or null when absent.
 *
 * @example
 * await getProject("marketing-site");
 */
export async function getProject(projectName: string): Promise<ReturnType<typeof mapProject> | null> {
  const rows = await query<ProjectRow[]>(`projects?select=*,jobs(*)&name=eq.${encodeURIComponent(projectName)}&deleted_at=is.null&jobs.order=created_at.asc,id.asc`);
  if (!rows[0]) return null;
  const profiles = await getProfiles([rows[0].owner_id, ...(rows[0].jobs ?? []).map((job) => job.created_by)]);
  return mapProject(rows[0], profiles);
}

async function getProjectRow(projectName: string): Promise<ProjectRow> {
  const rows = await query<ProjectRow[]>(`projects?select=*&name=eq.${encodeURIComponent(projectName)}&deleted_at=is.null&limit=1`);
  if (!rows[0]) throw new Error("Project not found");
  return rows[0];
}

async function getJob(projectName: string, jobId?: string): Promise<JobRow> {
  const resource = jobId
    ? `jobs?select=*&id=eq.${jobId}&limit=1`
    : `jobs?select=*,projects!inner(name)&kind=eq.create&projects.name=eq.${encodeURIComponent(projectName)}&order=created_at.desc&limit=1`;
  const rows = await query<JobRow[]>(resource);
  if (!rows[0]) throw new Error("Project job not found");
  return rows[0];
}

function hourCeiling(hours: number): Date {
  const date = new Date(Date.now() + hours * 60 * 60 * 1000);
  date.setUTCMinutes(0, 0, 0);
  date.setUTCHours(date.getUTCHours() + 1);
  return date;
}

async function getProfiles(ids: Array<string | null>): Promise<Map<string, ProfileRow>> {
  const uniqueIds = [...new Set(ids.filter((id): id is string => Boolean(id)))];
  if (!uniqueIds.length) return new Map();
  const rows = await query<ProfileRow[]>(`profiles?select=id,first_name,last_name,department&id=in.(${uniqueIds.join(",")})`);
  return new Map(rows.map((profile) => [profile.id, profile]));
}

function creator(id: string | null, profiles: Map<string, ProfileRow>) {
  if (!id) return null;
  const profile = profiles.get(id);
  return {
    id,
    ...(profile
      ? {
          name: `${profile.first_name} ${profile.last_name}`.trim(),
          department: profile.department,
        }
      : { name: id, department: null }),
  };
}

function mapProject(project: ProjectRow, profiles = new Map<string, ProfileRow>()) {
  const jobs = project.jobs ?? [];
  const createJob = jobs.filter((job) => job.kind === "create").at(-1);
  const statuses: Record<string, unknown> = { ...(createJob?.progress ?? {}) };
  const revisions = jobs.filter((job) => job.kind === "revision").map((job) => ({
    ...(job.request ?? {}),
    revision_id: job.id,
    status: job.status,
    ...((job.progress.revision as Record<string, unknown> | undefined) ?? {}),
    ...(job.summary ? { summary: job.summary } : {}),
    ...(job.error ? { error: job.error } : {}),
    updated_at: job.updated_at,
    created_by: creator(job.created_by, profiles),
  }));
  if (revisions.length) statuses.revision = { request: revisions };
  if (project.preview_status !== "stopped") {
    statuses.run = {
      status: project.preview_status === "starting" ? "processing" : project.preview_status === "ready" ? "completed" : "failed",
      ...(project.preview_base_url ? { url: project.preview_base_url } : {}),
      ...(project.preview_error ? { error: project.preview_error } : {}),
      updated_at: project.updated_at,
    };
  }
  const projectCreator = creator(project.owner_id, profiles);
  return {
    project_id: project.id,
    project_name: project.name,
    updated_at: project.updated_at,
    project: {
      id: project.id,
      name: project.name,
      created_at: project.created_at,
      created_by: projectCreator,
    },
    revisions: revisions.map((revision) => ({
      ...revision,
      id: revision.revision_id,
      prompt: typeof (revision as Record<string, unknown>).prompt === "string" ? (revision as Record<string, unknown>).prompt : null,
      created_at: jobs.find((job) => job.id === revision.revision_id)?.created_at ?? null,
      created_by: revision.created_by,
    })),
    statuses,
  };
}
