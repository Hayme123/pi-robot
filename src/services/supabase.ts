import { randomUUID } from "node:crypto";
import { config } from "../config.js";

export type JobStatus = {
  status: "processing" | "completed" | "failed";
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

export type ProjectStage = "setup" | "html" | "angular" | "revision" | "run";

type JobRow = {
  id: string;
  project_id: string;
  kind: "create" | "revision";
  stage: string;
  status: string;
  request: Record<string, unknown> | null;
  progress: Record<string, unknown>;
  summary: string | null;
  error: string | null;
  created_at: string;
  started_at: string | null;
  updated_at: string;
};

type ProjectRow = {
  id: string;
  owner_id: string | null;
  name: string;
  current_artifact_prefix?: string | null;
  preview_status: "starting" | "ready" | "stopped" | "failed" | "expired";
  preview_base_url: string | null;
  preview_error: string | null;
  preview_expires_at: string | null;
  local_expires_at?: string | null;
  updated_at: string;
  jobs?: JobRow[];
};

const stageNames: Record<ProjectStage, string> = {
  setup: "setup",
  html: "html",
  angular: "angular",
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
      body: JSON.stringify({ id: jobId, project_id: projectId, kind: "create", request: request ?? null }),
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
 * @returns {Promise<string>} Project identifier.
 *
 * @example
 * await createRevisionJob("marketing-site", "revision-id", { comments: [] });
 */
export async function createRevisionJob(projectName: string, jobId: string, request: Record<string, unknown>): Promise<string> {
  const project = await getProjectRow(projectName);
  await query("jobs", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ id: jobId, project_id: project.id, kind: "revision", stage: "angular", request }),
  });
  return project.id;
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
 * await updatePreview("marketing-site", { status: "completed", url: "http://localhost:8080/previews/4200/" });
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
  await query(`projects?name=eq.${encodeURIComponent(projectName)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ preview_status: "stopped", preview_base_url: null, preview_error: null, preview_expires_at: null, updated_at: new Date().toISOString() }),
  });
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
  const rows = await query<Pick<ProjectRow, "name" | "preview_expires_at" | "local_expires_at" | "current_artifact_prefix">[]>(`projects?select=name,preview_expires_at,local_expires_at,current_artifact_prefix&name=eq.${encodeURIComponent(projectName)}&limit=1`);
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
  const rows = await query<ProjectRow[]>("projects?select=*,jobs(*)&order=name.asc&jobs.order=created_at.asc");
  return rows.map(mapProject);
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
  const rows = await query<ProjectRow[]>(`projects?select=*,jobs(*)&name=eq.${encodeURIComponent(projectName)}&jobs.order=created_at.asc`);
  return rows[0] ? mapProject(rows[0]) : null;
}

async function getProjectRow(projectName: string): Promise<ProjectRow> {
  const rows = await query<ProjectRow[]>(`projects?select=*&name=eq.${encodeURIComponent(projectName)}&limit=1`);
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

function mapProject(project: ProjectRow) {
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
  return { project_id: project.id, project_name: project.name, statuses };
}
