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
  preview_status: "starting" | "ready" | "stopped" | "failed" | "expired";
  preview_base_url: string | null;
  preview_error: string | null;
  preview_expires_at: string | null;
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

export async function createRevisionJob(projectName: string, jobId: string, request: Record<string, unknown>): Promise<string> {
  const project = await getProjectRow(projectName);
  await query("jobs", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ id: jobId, project_id: project.id, kind: "revision", stage: "angular", request }),
  });
  return project.id;
}

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
      updated_at: updatedAt,
    }),
  });
}

export async function stopPreview(projectName: string): Promise<void> {
  await query(`projects?name=eq.${encodeURIComponent(projectName)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ preview_status: "stopped", preview_base_url: null, preview_error: null, updated_at: new Date().toISOString() }),
  });
}

export async function listProjects(): Promise<ReturnType<typeof mapProject>[]> {
  const rows = await query<ProjectRow[]>("projects?select=*,jobs(*)&order=name.asc&jobs.order=created_at.asc");
  return rows.map(mapProject);
}

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
