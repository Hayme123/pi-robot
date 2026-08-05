import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { artifactKeys, artifactPrefix } from "./cloud-contracts.js";
import { downloadObject, objectExists, renameObject, signedDownloadUrl, uploadObject } from "./r2.js";
import { completeArtifact } from "./supabase.js";
import { readProjectFiles } from "./project-files.js";

const run = promisify(execFile);
const syncMarker = ".r2-synced";
const restores = new Map<string, Promise<string | null>>();

/**
 * Lists workspace paths excluded from R2 archives.
 *
 * @returns {string[]} Archive exclusion patterns.
 *
 * @example
 * archiveExclusions().includes("node_modules/*");
 */
export function archiveExclusions(): string[] {
  return [
    "node_modules/*", "*/node_modules/*", ".angular/*", "*/.angular/*", "dist/*", "*/dist/*",
    ".env", "*/.env", ".npmrc", "*/.npmrc", ".pi-agent/*", "*/.pi-agent/*",
    "auth.json", "*/auth.json", "*.log", "*/*.log", "*.tmp", "*/*.tmp", syncMarker,
  ];
}

/**
 * Archives and uploads a project's workspace and file listing.
 *
 * @param {string} projectName - Project name.
 * @param {string} jobId - Producing job identifier.
 * @param {string} projectDir - Local project directory.
 * @returns {Promise<string>} Uploaded artifact prefix.
 *
 * @example
 * await persistProjectArtifact("marketing-site", "job-id", "projects/marketing-site");
 */
export async function persistProjectArtifact(projectName: string, jobId: string, projectDir: string): Promise<string> {
  const keys = artifactKeys(projectName);
  const temp = await mkdtemp(path.join(tmpdir(), "pi-artifact-"));
  const workspace = path.join(temp, "workspace.zip");
  try {
    await run("zip", ["-qr", workspace, ".", "-x", ...archiveExclusions()], { cwd: projectDir });
    const files = JSON.stringify({ project_name: projectName, files: await readProjectFiles(path.join(projectDir, projectName)) });
    // ponytail: fixed project keys are last-write-wins; use versioned prefixes if snapshot history is needed.
    await uploadObject(keys.files, files, "application/json", true);
    await uploadObject(keys.workspace, await readFile(workspace), "application/zip", true);
    if (!(await Promise.all([keys.workspace, keys.files].map(objectExists))).every(Boolean)) {
      throw new Error("Required R2 artifacts were not found after upload");
    }
    const prefix = keys.workspace.slice(0, -"/workspace.zip".length);
    await completeArtifact(projectName, jobId, prefix);
    await writeFile(path.join(projectDir, syncMarker), new Date().toISOString());
    return prefix;
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
}

/**
 * Retrieves a project's uploaded source-file listing.
 *
 * @param {string} projectName - Project name.
 * @returns {Promise<unknown | null>} File listing, or null when absent.
 *
 * @example
 * await getProjectFiles("marketing-site");
 */
/** Renames the current R2 artifacts to match a deleted project's renamed record. */
export async function renameProjectArtifacts(projectName: string, renamedProjectName: string): Promise<boolean> {
  const source = artifactKeys(projectName);
  const destination = artifactKeys(renamedProjectName);
  let moved = false;
  for (const key of ["workspace", "files"] as const) {
    if (!(await objectExists(source[key]))) continue;
    await renameObject(source[key], destination[key]);
    moved = true;
  }
  return moved;
}

export async function getProjectFiles(projectName: string): Promise<unknown | null> {
  const key = `${artifactPrefix(projectName)}/files.json`;
  if (!(await objectExists(key))) return null;
  return JSON.parse((await downloadObject(key)).toString("utf8"));
}

/**
 * Creates a signed download URL for a project's workspace archive.
 *
 * @param {string} projectName - Project name.
 * @returns {Promise<string | null>} Download URL, or null when absent.
 *
 * @example
 * await getProjectDownloadUrl("marketing-site");
 */
export async function getProjectDownloadUrl(projectName: string): Promise<string | null> {
  const key = `${artifactPrefix(projectName)}/workspace.zip`;
  return (await objectExists(key)) ? signedDownloadUrl(key, `${projectName}.zip`) : null;
}

/**
 * Restores a project workspace from R2, sharing concurrent restores.
 *
 * @param {string} projectName - Project name.
 * @param {string} projectsRoot - Local project root.
 * @returns {Promise<string | null>} Restored Angular directory, or null when absent.
 *
 * @example
 * await restoreProjectWorkspace("marketing-site", "projects");
 */
export function restoreProjectWorkspace(projectName: string, projectsRoot: string): Promise<string | null> {
  const key = path.join(projectsRoot, projectName);
  const existing = restores.get(key);
  if (existing) return existing;
  const restore = restoreProject(projectName, projectsRoot).finally(() => restores.delete(key));
  restores.set(key, restore);
  return restore;
}

async function restoreProject(projectName: string, projectsRoot: string): Promise<string | null> {
  const workspaceKey = `${artifactPrefix(projectName)}/workspace.zip`;
  if (!(await objectExists(workspaceKey))) return null;
  await mkdir(projectsRoot, { recursive: true });
  const projectDir = path.join(projectsRoot, projectName);
  const staging = await mkdtemp(path.join(projectsRoot, ".restore-"));
  const archive = path.join(staging, "workspace.zip");
  const extracted = path.join(staging, "project");
  try {
    await writeFile(archive, await downloadObject(workspaceKey));
    await mkdir(extracted);
    await run("unzip", ["-q", "-o", archive, "-d", extracted]);
    await rm(projectDir, { recursive: true, force: true });
    await rename(extracted, projectDir);
    await writeFile(path.join(projectDir, syncMarker), new Date().toISOString());
    return path.join(projectDir, projectName);
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
}

/**
 * Deletes expired, R2-synced local project workspaces.
 *
 * @param {string} projectsRoot - Local project root.
 * @param {ReadonlySet<string>} protectedProjects - Projects that must remain local.
 * @param {number} now - Current epoch time in milliseconds.
 * @param {number} maxAgeMs - Maximum marker age before deletion.
 * @returns {Promise<string[]>} Deleted project names.
 *
 * @example
 * await cleanupSyncedProjects("projects", new Set());
 */
export async function cleanupSyncedProjects(projectsRoot: string, protectedProjects: ReadonlySet<string>, now = Date.now(), maxAgeMs = 24 * 60 * 60 * 1000): Promise<string[]> {
  const deleted: string[] = [];
  for (const entry of await readdir(projectsRoot, { withFileTypes: true }).catch(() => [])) {
    if (!entry.isDirectory() || entry.name.startsWith(".restore-") || protectedProjects.has(entry.name)) continue;
    const projectDir = path.join(projectsRoot, entry.name);
    try {
      const synced = await stat(path.join(projectDir, syncMarker));
      if (now - synced.mtimeMs < maxAgeMs) continue;
      await rm(projectDir, { recursive: true, force: true });
      deleted.push(entry.name);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
  return deleted;
}
