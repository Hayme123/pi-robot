import { execFile, spawn, type ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";
import { access, mkdir, mkdtemp, readFile, rename, rm, symlink, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import type { FastifyBaseLogger, FastifyPluginAsync } from "fastify";
import { config } from "../config.js";
import { authenticate } from "../services/auth.js";
import { downloadFigmaFrames } from "../services/figma.js";
import { getProjectDownloadUrl, getProjectFiles, persistProjectArtifact, renameProjectArtifacts, restoreProjectWorkspace } from "../services/artifacts.js";
import { applyProjectRevision, defineProjectName, generateAngularProject, generateProjectHtml, generatePromptProject } from "../services/pi.js";
import { readProjectFiles } from "../services/project-files.js";
import {
  createProject,
  createRevisionJob,
  getArtifactJob,
  getProject,
  listProjects,
  softDeleteProject,
  stopActivePreviews,
  clearLocalExpiry,
  getProjectExpiry,
  renewLocalExpiry,
  stopPreview,
  updateJobStatus,
  updatePreview,
  type ProjectStage,
} from "../services/supabase.js";

const run = promisify(execFile);

type CreateProjectBody = {
  project_name?: unknown;
  figma_url?: unknown;
  figma_image_url?: unknown;
  file_key?: unknown;
  node_ids?: string[];
};

type PromptProjectBody = { prompt?: unknown };

type FigmaFrame = { project_id: string; node_id: string };
type Interaction = {
  trigger: "click";
  presentation: "auto" | "modal" | "tab" | "new_page" | "popover" | "inline";
};
type RevisionComment = Record<string, unknown> & {
  id?: string | number;
  figma_frame?: FigmaFrame;
  interaction?: Interaction;
};

type ThinkingLevel = "low" | "medium" | "high";
type Revision = { prompt: string | null; comments: RevisionComment[]; thinking_level: ThinkingLevel };

type JobStatus = {
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

const createProjectSchema = {
  body: {
    type: "object",
    additionalProperties: false,
    required: ["project_name", "figma_url", "figma_image_url", "file_key", "node_ids"],
    properties: {
      project_name: { type: "string" },
      figma_url: { type: "string" },
      figma_image_url: { type: "string" },
      file_key: { type: "string" },
      node_ids: { type: "array", items: { type: "string" } },
    },
  },
};

const promptProjectSchema = {
  body: {
    type: "object",
    additionalProperties: false,
    required: ["prompt"],
    properties: { prompt: { type: "string" } },
  },
};

/**
 * Registers project creation and scaffold extraction.
 *
 * @param {import("fastify").FastifyInstance} app - Fastify application instance.
 * @returns {Promise<void>} Resolves after the route is registered.
 *
 * @example
 * await app.register(projectRoutes);
 */
const projectRoutes: FastifyPluginAsync = async (app) => {
  await mkdir(config.projectsRoot, { recursive: true });
  await stopActivePreviews();
  const runningProjects = new Map<string, Promise<RunningProject>>();
  const activeProjects = new Set<string>();

  app.addHook("onClose", async () => {
    app.log.info({ runningProjects: runningProjects.size }, "Stopping project processes");
    const projects = await Promise.allSettled(runningProjects.values());
    for (const project of projects) {
      if (project.status === "fulfilled") {
        project.value.angular.kill();
        await project.value.restoreBaseHref();
      }
    }
  });

  app.get("/projects", async () => ({ projects: (await listProjects()).map(({ project_name, updated_at }) => ({ project_name, updated_at })) }));

  app.get<{ Params: { projectName: string } }>("/project/:projectName/download", async (request, reply) => {
    const { projectName } = request.params;
    if (!isProjectName(projectName)) return reply.code(400).send({ error: "project_name must be a folder name" });
    const url = await getProjectDownloadUrl(projectName);
    return url ? reply.redirect(url) : reply.code(404).send({ error: "Angular source not found" });
  });

  app.get<{ Params: { projectName: string } }>("/project/:projectName/files", async (request, reply) => {
    const { projectName } = request.params;
    if (!isProjectName(projectName)) return reply.code(400).send({ error: "project_name must be a folder name" });
    const files = await getProjectFiles(projectName);
    if (files) return files;

    // Compatibility fallback for projects not migrated to R2 yet.
    const angularDir = path.join(config.projectsRoot, projectName, projectName);
    try {
      await access(path.join(angularDir, "angular.json"));
      return { project_name: projectName, files: await readProjectFiles(angularDir) };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return reply.code(404).send({ error: "Angular source not found" });
      throw error;
    }
  });

  app.get<{ Params: { projectName: string } }>("/project/:projectName", async (request, reply) => {
    const { projectName } = request.params;
    if (!isProjectName(projectName)) {
      return reply.code(400).send({ error: "project_name must be a folder name" });
    }

    const project = await getProject(projectName);
    return project ?? reply.code(404).send({ error: "Project not found" });
  });

  app.delete<{ Params: { projectName: string } }>("/project/:projectName", { preHandler: authenticate }, async (request, reply) => {
    const { projectName } = request.params;
    if (!isProjectName(projectName)) return reply.code(400).send({ error: "project_name must be a folder name" });

    if (!(await getProject(projectName))) return reply.code(404).send({ error: "Project not found" });
    await stopTrackedPreview(projectName, runningProjects);
    const deletedProjectName = `${projectName} ${new Date().toISOString().replace(/[.:]/g, "-")}`;
    const artifactsRenamed = await renameProjectArtifacts(projectName, deletedProjectName);
    if (!(await softDeleteProject(projectName, deletedProjectName, artifactsRenamed))) return reply.code(404).send({ error: "Project not found" });
    try {
      await rename(path.join(config.projectsRoot, projectName), path.join(config.projectsRoot, deletedProjectName));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    return { project_name: projectName, deleted_project_name: deletedProjectName, status: "deleted" };
  });

  app.post<{ Body: PromptProjectBody }>("/project/prompt", { schema: promptProjectSchema, preHandler: authenticate }, async (request, reply) => {
    const prompt = request.body?.prompt;
    if (typeof prompt !== "string" || !prompt.trim()) {
      return reply.code(400).send({ error: "prompt must be a non-empty string" });
    }

    const existingNames = (await listProjects()).map((project) => project.project_name);
    const projectName = await defineProjectName(prompt.trim(), config.projectsRoot, existingNames, request.log);
    const projectDir = path.join(config.projectsRoot, projectName);
    const angularDir = path.join(projectDir, projectName);
    try {
      await mkdir(projectDir);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "EEXIST") {
        return reply.code(409).send({ error: "Project already exists" });
      }
      throw error;
    }

    const { projectId, jobId } = await createProject(projectName, request.ownerId, { prompt: prompt.trim() });
    await writeSetupStatus(projectDir, { status: "processing" });
    runProjectTask(projectName, activeProjects, async () => {
      let writeFailure = writeSetupStatus;
      try {
        await extractScaffold(angularDir, request.log);
        await writeSetupStatus(projectDir, { status: "completed" });

        writeFailure = writeAngularStatus;
        await writeAngularStatus(projectDir, { status: "processing" });
        await prepareAngularDependencies(angularDir, request.log);
        const usage = await generatePromptProject(prompt.trim(), angularDir, request.log);
        await writeAngularStatus(projectDir, {
          status: "completed",
          cost: usage.cost,
          context_length: usage.contextLength,
          context_window: usage.contextWindow,
          context_percent: usage.contextPercent,
        });
        writeFailure = writePersistStatus;
        await persistProject(projectName, jobId, projectDir);

        writeFailure = writeRunStatus;
        await writeRunStatus(projectDir, { status: "processing" });
        await prepareAngularDependencies(angularDir, request.log);
        const { url } = await ensureRunningProject(projectName, angularDir, runningProjects, app.log);
        await writeRunStatus(projectDir, { status: "completed", url });
        app.log.info({ projectName, url }, "Prompt-generated project is publicly available");
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await writeFailure(projectDir, { status: "failed", error: message });
        app.log.error(error, `Prompt project generation failed: ${projectName}`);
      }
    });

    return reply.code(202).send(queuedResponse(projectName, projectId, jobId));
  });

  app.post<{ Body: CreateProjectBody }>("/project/all", { schema: createProjectSchema, preHandler: authenticate }, async (request, reply) => {
    const projectName = request.body?.project_name;

    if (!isProjectName(projectName)) {
      return reply.code(400).send({ error: "project_name must be a folder name" });
    }

    const projectDir = path.join(config.projectsRoot, projectName);
    const angularDir = path.join(projectDir, projectName);
    try {
      await mkdir(projectDir);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "EEXIST") {
        return reply.code(409).send({ error: "Project already exists" });
      }
      throw error;
    }

    const { projectId, jobId } = await createProject(projectName, request.ownerId, request.body as Record<string, unknown>);
    await writeSetupStatus(projectDir, { status: "processing" });
    runProjectTask(projectName, activeProjects, async () => {
      let writeFailure = writeSetupStatus;
      try {
        await createProjectFiles(
          projectDir,
          angularDir,
          String(request.body.file_key),
          request.body.node_ids ?? [],
          request.log,
        );
        await persistProjectArtifact(projectName, jobId, projectDir);
        await writeSetupStatus(projectDir, { status: "completed" });

        writeFailure = writeHtmlStatus;
        await writeHtmlStatus(projectDir, { status: "processing" });
        const html = await generateProjectHtml(projectDir, angularDir, request.log);
        await writeHtmlStatus(projectDir, {
          status: "completed",
          cost: html.cost,
          context_length: html.contextLength,
          context_window: html.contextWindow,
          context_percent: html.contextPercent,
          output_html: "index.html",
        });
        writeFailure = writePersistStatus;
        await persistProject(projectName, jobId, projectDir);

        writeFailure = writeAngularStatus;
        await writeAngularStatus(projectDir, { status: "processing" });
        await prepareAngularDependencies(angularDir, request.log);
        const angular = await generateAngularProject(projectDir, angularDir, request.log);
        await writeAngularStatus(projectDir, {
          status: "completed",
          cost: angular.cost,
          context_length: angular.contextLength,
          context_window: angular.contextWindow,
          context_percent: angular.contextPercent,
        });
        writeFailure = writePersistStatus;
        await persistProject(projectName, jobId, projectDir);

        writeFailure = writeRunStatus;
        await writeRunStatus(projectDir, { status: "processing" });
        await prepareAngularDependencies(angularDir, request.log);
        const { url } = await ensureRunningProject(projectName, angularDir, runningProjects, app.log);
        await writeRunStatus(projectDir, { status: "completed", url });
        app.log.info({ projectName, url }, "Full project pipeline completed");
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await writeFailure(projectDir, { status: "failed", error: message });
        app.log.error(error, `Full project pipeline failed: ${projectName}`);
      }
    });

    return reply.code(202).send(queuedResponse(projectName, projectId, jobId));
  });

  app.post<{ Body: CreateProjectBody }>("/project", { schema: createProjectSchema, preHandler: authenticate }, async (request, reply) => {
    const projectName = request.body?.project_name;

    if (!isProjectName(projectName)) {
      request.log.warn("Rejected project creation with an invalid name");
      return reply.code(400).send({ error: "project_name must be a folder name" });
    }

    request.log.info({ projectName }, "Creating project");
    const projectDir = path.join(config.projectsRoot, projectName);
    const scaffoldDir = path.join(projectDir, projectName);
    try {
      await mkdir(projectDir);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "EEXIST") {
        request.log.warn({ projectName }, "Project already exists");
        return reply.code(409).send({ error: "Project already exists" });
      }
      throw error;
    }

    const { projectId, jobId } = await createProject(projectName, request.ownerId, request.body as Record<string, unknown>);
    await writeSetupStatus(projectDir, { status: "processing" });
    runProjectTask(projectName, activeProjects, async () => {
      try {
        await createProjectFiles(projectDir, scaffoldDir, String(request.body.file_key), request.body.node_ids ?? [], request.log);
        await persistProjectArtifact(projectName, jobId, projectDir);
        await writeSetupStatus(projectDir, { status: "completed" });
        request.log.info({ projectName }, "Project setup completed");
      } catch (error) {
        await writeSetupStatus(projectDir, { status: "failed", error: error instanceof Error ? error.message : String(error) });
        app.log.error(error, `Project setup failed: ${projectName}`);
      }
    });

    request.log.info({ projectName }, "Project creation queued");
    return reply.code(202).send(queuedResponse(projectName, projectId, jobId));
  });

  /**
   * Starts background HTML generation from a prepared project's Figma reference files.
   *
   * @param {import("fastify").FastifyRequest} request - Request containing the project name.
   * @param {import("fastify").FastifyReply} reply - Reply used to send the job status.
   * @returns {Promise<{ project_name: string, status: string }>} Accepted HTML generation job.
   */
  app.post<{ Params: { projectName: string } }>("/project/:projectName/html", { preHandler: authenticate }, async (request, reply) => {
    const { projectName } = request.params;
    if (!isProjectName(projectName)) {
      request.log.warn("Rejected HTML generation with an invalid project name");
      return reply.code(400).send({ error: "project_name must be a folder name" });
    }

    request.log.info({ projectName }, "Starting HTML generation request");
    const projectDir = path.join(config.projectsRoot, projectName);
    const scaffoldDir = path.join(projectDir, projectName);
    const htmlInputs = () => Promise.all([
      access(path.join(projectDir, "frame_data_clean.json")),
      access(path.join(projectDir, "frame.png")),
      access(path.join(projectDir, "svg")),
      access(scaffoldDir),
    ]);
    try {
      await htmlInputs();
    } catch {
      if (!(await restoreProjectWorkspace(projectName, config.projectsRoot))) {
        request.log.warn({ projectName }, "HTML generation inputs were not found");
        return reply.code(404).send({ error: "Project setup or Figma reference files were not found" });
      }
      try {
        await htmlInputs();
      } catch {
        return reply.code(404).send({ error: "Project setup or Figma reference files were not found" });
      }
    }

    const { projectId, jobId } = await getArtifactJob(projectName);
    await writeHtmlStatus(projectDir, { status: "processing" });
    runProjectTask(projectName, activeProjects, async () => {
      let writeFailure = writeHtmlStatus;
      try {
        const { cost, contextLength, contextWindow, contextPercent } = await generateProjectHtml(projectDir, scaffoldDir, request.log);
        await writeHtmlStatus(projectDir, {
          status: "completed",
          cost,
          context_length: contextLength,
          context_window: contextWindow,
          context_percent: contextPercent,
          output_html: "index.html",
        });
        writeFailure = writePersistStatus;
        await persistProject(projectName, jobId, projectDir);
        request.log.info({ projectName, cost }, "HTML generation job completed");
      } catch (error) {
        await writeFailure(projectDir, { status: "failed", error: error instanceof Error ? error.message : String(error) });
        app.log.error(error, `HTML generation failed: ${projectName}`);
      }
    });

    request.log.info({ projectName }, "HTML generation queued");
    return reply.code(202).send({ project_name: projectName, status: "processing" });
  });

  /**
   * Starts background Angular generation from a project's generated HTML reference.
   *
   * @param {import("fastify").FastifyRequest} request - Request containing the project name.
   * @param {import("fastify").FastifyReply} reply - Reply used to send the job status.
   * @returns {Promise<{ project_name: string, status: string }>} Accepted Angular generation job.
   */
  app.post<{ Params: { projectName: string } }>("/project/:projectName/angular", { preHandler: authenticate }, async (request, reply) => {
    const { projectName } = request.params;
    if (!isProjectName(projectName)) {
      request.log.warn("Rejected Angular generation with an invalid project name");
      return reply.code(400).send({ error: "project_name must be a folder name" });
    }

    request.log.info({ projectName }, "Starting Angular generation request");
    const projectDir = path.join(config.projectsRoot, projectName);
    const angularDir = path.join(projectDir, projectName);
    const angularInputs = () => Promise.all([
      access(path.join(projectDir, "index.html")),
      access(path.join(projectDir, "frame.png")),
      access(angularDir),
    ]);
    try {
      await angularInputs();
    } catch {
      if (!(await restoreProjectWorkspace(projectName, config.projectsRoot))) {
        request.log.warn({ projectName }, "Angular generation inputs were not found");
        return reply.code(404).send({ error: "Project HTML, image, or Angular scaffold was not found" });
      }
      try {
        await angularInputs();
      } catch {
        return reply.code(404).send({ error: "Project HTML, image, or Angular scaffold was not found" });
      }
    }

    const { projectId, jobId } = await getArtifactJob(projectName);
    await writeAngularStatus(projectDir, { status: "processing" });
    runProjectTask(projectName, activeProjects, async () => {
      let writeFailure = writeAngularStatus;
      try {
        await prepareAngularDependencies(angularDir, request.log);
        const { cost, contextLength, contextWindow, contextPercent } = await generateAngularProject(projectDir, angularDir, request.log);
        await writeAngularStatus(projectDir, {
          status: "completed",
          cost,
          context_length: contextLength,
          context_window: contextWindow,
          context_percent: contextPercent,
        });
        writeFailure = writePersistStatus;
        await persistProject(projectName, jobId, projectDir);
        request.log.info({ projectName, cost }, "Angular generation job completed");
      } catch (error) {
        await writeFailure(projectDir, { status: "failed", error: error instanceof Error ? error.message : String(error) });
        app.log.error(error, `Angular generation failed: ${projectName}`);
      }
    });
    request.log.info({ projectName }, "Angular generation queued");
    return reply.code(202).send({ project_name: projectName, status: "processing" });
  });

  app.post<{ Params: { projectName: string }; Body: unknown }>("/project/:projectName/revisions", { preHandler: authenticate }, async (request, reply) => {
    const { projectName } = request.params;
    const revision = parseRevision(request.body);
    if (!isProjectName(projectName) || !revision) {
      return reply.code(400).send({ error: "invalid_revision" });
    }

    const projectDir = path.join(config.projectsRoot, projectName);
    const angularDir = path.join(projectDir, projectName);
    try {
      await access(path.join(angularDir, "angular.json"));
    } catch {
      if (!(await restoreProjectWorkspace(projectName, config.projectsRoot))) return reply.code(404).send({ error: "Project not found" });
    }

    const revisionId = randomUUID();
    const projectId = await createRevisionJob(projectName, revisionId, revision as unknown as Record<string, unknown>);
    const assetsDir = path.join(projectDir, ".revision-assets", revisionId);
    await writeRevisionStatus(projectDir, { revision_id: revisionId, request: revision, status: "processing" });

    runProjectTask(projectName, activeProjects, async () => {
      try {
        const frameResults = await Promise.all(revision.comments.map(async (comment, index) => {
          if (!comment.figma_frame) return null;
          const directory = path.join(assetsDir, String(index));
          await downloadFigmaFrames(comment.figma_frame.project_id, [comment.figma_frame.node_id], directory, request.log);
          if (!requiresRevisionHtml(comment.interaction?.presentation)) {
            return { frame: { commentId: comment.id ?? index, directory }, htmlCost: 0 };
          }
          const html = await generateProjectHtml(directory, angularDir, request.log);
          return {
            frame: { commentId: comment.id ?? index, directory, htmlPath: path.join(directory, "index.html") },
            htmlCost: html.cost,
          };
        }));
        const completedFrames = frameResults.filter((result) => result !== null);
        const figmaFrames = completedFrames.map(({ frame }) => frame);
        const htmlCost = completedFrames.reduce((total, result) => total + result.htmlCost, 0);
        await prepareAngularDependencies(angularDir, request.log);
        const usage = await applyProjectRevision(angularDir, revision, figmaFrames, revision.thinking_level, request.log);
        await writeRevisionStatus(projectDir, {
          revision_id: revisionId,
          request: revision,
          status: "completed",
          cost: htmlCost + usage.cost,
          context_length: usage.contextLength,
          context_window: usage.contextWindow,
          context_percent: usage.contextPercent,
          summary: usage.summary,
        });
        await persistProject(projectName, revisionId, projectDir);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await writeRevisionStatus(projectDir, { revision_id: revisionId, request: revision, status: "failed", error: message });
        app.log.error(error, `Project revision failed: ${projectName}`);
        return;
      }

    });

    return reply.code(202).send(queuedResponse(projectName, projectId, revisionId));
  });

  app.post<{ Params: { projectName: string } }>("/project/:projectName/stop", { preHandler: authenticate }, async (request, reply) => {
    const { projectName } = request.params;
    if (!isProjectName(projectName)) {
      return reply.code(400).send({ error: "project_name must be a folder name" });
    }

    const running = runningProjects.get(projectName);
    if (!running) return reply.code(404).send({ error: "Project is not running" });

    try {
      const { angular, restoreBaseHref } = await running;
      angular.kill();
      await restoreBaseHref();
      runningProjects.delete(projectName);
      await stopPreview(projectName);
      request.log.info({ projectName }, "Project preview stopped");
      return { project_name: projectName, status: "stopped" };
    } catch {
      runningProjects.delete(projectName);
      return reply.code(404).send({ error: "Project is not running" });
    }
  });

  app.post("/projects/run", { preHandler: authenticate }, async (request) => {
    const projectNames = (await listProjects()).map((project) => project.project_name);

    const projects = await Promise.all(projectNames.map(async (projectName) => {
      const projectDir = path.join(config.projectsRoot, projectName);
      let angularDir = path.join(projectDir, projectName);
      try {
        await access(path.join(angularDir, "angular.json"));
      } catch {
        const restored = await restoreProjectWorkspace(projectName, config.projectsRoot);
        if (!restored) return { project_name: projectName, status: "skipped", error: "Built Angular project was not found" };
        angularDir = restored;
      }
      await prepareAngularDependencies(angularDir, request.log);

      await writeRunStatus(projectDir, { status: "processing" });
      try {
        const { url } = await ensureRunningProject(projectName, angularDir, runningProjects, app.log);
        await writeRunStatus(projectDir, { status: "completed", url });
        return { project_name: projectName, status: "running", url };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await writeRunStatus(projectDir, { status: "failed", error: message });
        app.log.error(error, `Project launch failed: ${projectName}`);
        return { project_name: projectName, status: "failed", error: message };
      }
    }));

    return { projects };
  });

  app.post<{ Params: { projectName: string } }>("/project/:projectName/run", { preHandler: authenticate }, async (request, reply) => {
    const { projectName } = request.params;
    if (!isProjectName(projectName)) {
      request.log.warn("Rejected project launch with an invalid project name");
      return reply.code(400).send({ error: "project_name must be a folder name" });
    }

    request.log.info({ projectName }, "Launching project");
    let angularDir = path.join(config.projectsRoot, projectName, projectName);
    try {
      await access(path.join(angularDir, "angular.json"));
    } catch {
      const restored = await restoreProjectWorkspace(projectName, config.projectsRoot);
      if (!restored) {
        request.log.warn({ projectName }, "Built Angular project was not found");
        return reply.code(404).send({ error: "Built Angular project was not found" });
      }
      angularDir = restored;
    }
    await prepareAngularDependencies(angularDir, request.log);

    const projectDir = path.dirname(angularDir);
    await renewLocalExpiry(projectName);
    await writeRunStatus(projectDir, { status: "processing" });
    try {
      const { url } = await ensureRunningProject(projectName, angularDir, runningProjects, app.log);
      await writeRunStatus(projectDir, { status: "completed", url });
      request.log.info({ projectName, url }, "Project is publicly available");
      return { project_name: projectName, url };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await writeRunStatus(projectDir, { status: "failed", error: message });
      app.log.error(error, `Project launch failed: ${projectName}`);
      return reply.code(500).send({ error: message });
    }
  });

  app.post<{ Params: { projectName: string } }>("/internal/project/:projectName/expire-preview", async (request, reply) => {
    if (!isCronRequest(request.headers["x-cron-secret"])) return reply.code(401).send({ error: "unauthorized" });
    const project = await getProjectExpiry(request.params.projectName);
    if (!project || !isDueThisHour(project.preview_expires_at)) return { status: "skipped" };
    await stopTrackedPreview(request.params.projectName, runningProjects);
    await stopPreview(request.params.projectName);
    return { status: "stopped" };
  });

  app.post<{ Params: { projectName: string } }>("/internal/project/:projectName/expire-local", async (request, reply) => {
    if (!isCronRequest(request.headers["x-cron-secret"])) return reply.code(401).send({ error: "unauthorized" });
    const { projectName } = request.params;
    const project = await getProjectExpiry(projectName);
    if (!project || !isDueThisHour(project.local_expires_at)) return { status: "skipped" };
    if (!project.current_artifact_prefix) return reply.code(409).send({ error: "project_has_no_r2_artifact" });
    if (activeProjects.has(projectName)) return reply.code(409).send({ error: "project_is_active" });
    await stopTrackedPreview(projectName, runningProjects);
    await stopPreview(projectName);
    const projectDir = path.join(config.projectsRoot, projectName);
    try {
      await access(path.join(projectDir, ".r2-synced"));
    } catch {
      return reply.code(409).send({ error: "project_is_not_r2_synced" });
    }
    await rm(projectDir, { recursive: true, force: true });
    await clearLocalExpiry(projectName);
    return { status: "deleted" };
  });
};

function isCronRequest(secret: string | string[] | undefined): boolean {
  return typeof secret === "string" && Boolean(config.expiryCronSecret) && secret === config.expiryCronSecret;
}

function isDueThisHour(value: string | null | undefined): boolean {
  if (!value) return false;
  const expiry = new Date(value);
  const now = new Date();
  return !Number.isNaN(expiry.valueOf()) && expiry <= new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours(), 59, 59, 999));
}

async function stopTrackedPreview(projectName: string, runningProjects: Map<string, Promise<RunningProject>>): Promise<void> {
  const running = runningProjects.get(projectName);
  if (!running) return;
  runningProjects.delete(projectName);
  const { angular, restoreBaseHref } = await running;
  angular.kill();
  await restoreBaseHref();
}

function runProjectTask(projectName: string, activeProjects: Set<string>, task: () => Promise<void>): void {
  activeProjects.add(projectName);
  void task().finally(() => activeProjects.delete(projectName));
}

type RunningProject = { angular: ChildProcess; url: string; restoreBaseHref: () => Promise<void> };

function ensureRunningProject(
  projectName: string,
  angularDir: string,
  runningProjects: Map<string, Promise<RunningProject>>,
  log: FastifyBaseLogger,
): Promise<RunningProject> {
  let running = runningProjects.get(projectName);
  if (running) return running;

  running = startAngularPreview(angularDir, log);
  runningProjects.set(projectName, running);
  const current = running;
  const forget = () => runningProjects.get(projectName) === current && runningProjects.delete(projectName);
  void current
    .then(({ angular }) => angular.once("exit", (code, signal) => {
      log.warn({ projectName, code, signal }, "Angular process stopped");
      forget();
    }))
    .catch(forget);
  return running;
}

async function startAngularPreview(angularDir: string, log: FastifyBaseLogger): Promise<RunningProject> {
  const port = await getFreePreviewPort();
  log.info({ angularDir, port }, "Starting Angular development server");
  const ng = path.join(angularDir, "node_modules", ".bin", process.platform === "win32" ? "ng.cmd" : "ng");
  const restoreBaseHref = await setPreviewBaseHref(angularDir, port);
  const angular = spawn(ng, ["serve", "--host", "0.0.0.0", "--port", String(port), "--allowed-hosts", "--poll", "1000"], { cwd: angularDir });
  angular.stdout?.on("data", (chunk) => log.debug({ output: String(chunk).trim() }, "Angular output"));
  angular.stderr?.on("data", (chunk) => log.debug({ output: String(chunk).trim() }, "Angular error output"));

  try {
    await waitForUrl(`http://127.0.0.1:${port}`, angular, 120_000);
    const url = new URL(`/previews/${port}/`, config.publicBaseUrl).toString();
    log.info({ port, url }, "Angular preview is ready behind Nginx");
    return { angular, url, restoreBaseHref };
  } catch (error) {
    angular.kill();
    await restoreBaseHref();
    throw error;
  }
}

async function setPreviewBaseHref(angularDir: string, port: number): Promise<() => Promise<void>> {
  const angularJson = path.join(angularDir, "angular.json");
  const original = await readFile(angularJson, "utf8");
  const workspace = JSON.parse(original) as { projects: Record<string, { architect: { build: { options: Record<string, unknown> } } }> };
  const project = Object.values(workspace.projects)[0];
  if (!project) throw new Error("Angular workspace has no project");
  project.architect.build.options.baseHref = `/previews/${port}/`;
  await writeFile(angularJson, `${JSON.stringify(workspace, null, 2)}\n`);
  return () => writeFile(angularJson, original);
}

async function getFreePreviewPort(): Promise<number> {
  for (let port = 4200; port <= 4299; port++) {
    const available = await new Promise<boolean>((resolve) => {
      const server = createServer();
      server.once("error", () => resolve(false));
      server.listen(port, "0.0.0.0", () => server.close(() => resolve(true)));
    });
    if (available) return port;
  }
  throw new Error("No preview port is available");
}

async function waitForUrl(url: string, process: ChildProcess, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let spawnError: Error | undefined;
  const onError = (error: Error) => (spawnError = error);
  process.once("error", onError);
  try {
    while (Date.now() < deadline) {
      if (spawnError) throw spawnError;
      if (process.exitCode !== null) throw new Error("Angular stopped before it became ready");
      try {
        await fetch(url);
        return;
      } catch {}
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    throw new Error("Angular did not become ready in time");
  } finally {
    process.off("error", onError);
  }
}

/**
 * Scaffolds a project and downloads its Figma reference files in the background.
 *
 * @param {string} projectDir - Project output directory.
 * @param {string} scaffoldDir - Nested frontend scaffold directory.
 * @param {string} fileKey - Figma file key.
 * @param {string[]} nodeIds - Figma frame node IDs.
 * @returns {Promise<void>} Resolves after the scaffold and Figma reference files are ready.
 * @throws {Error} If scaffold extraction or Figma processing fails.
 *
 * @example
 * await createProjectFiles("projects/test", "projects/test/test", "abc123", ["1:2"]);
 */
async function createProjectFiles(
  projectDir: string,
  scaffoldDir: string,
  fileKey: string,
  nodeIds: string[],
  log: FastifyBaseLogger,
): Promise<void> {
  await Promise.all([
    extractScaffold(scaffoldDir, log),
    downloadFigmaFrames(fileKey, nodeIds, projectDir, log),
  ]);
}

async function extractScaffold(scaffoldDir: string, log: FastifyBaseLogger): Promise<void> {
  const stagingDir = await mkdtemp(path.join(tmpdir(), "frontend-scaffold-"));
  log.debug({ scaffoldDir }, "Extracting Angular scaffold");
  try {
    await run("unzip", ["-q", config.scaffoldArchive, "-d", stagingDir]);
    await mkdir(scaffoldDir);
    await run("cp", ["-a", `${path.join(stagingDir, "ai-coded-main")}/.`, scaffoldDir]);
  } finally {
    await rm(stagingDir, { recursive: true, force: true });
  }
}

async function prepareAngularDependencies(angularDir: string, log: FastifyBaseLogger): Promise<void> {
  const nodeModules = path.join(angularDir, "node_modules");
  const ng = path.join(nodeModules, ".bin", process.platform === "win32" ? "ng.cmd" : "ng");
  try {
    await access(ng);
    log.info({ angularDir }, "Reusing existing Angular dependencies");
    return;
  } catch {
    // Install or link dependencies below.
  }

  if (config.angularNodeModules) {
    await access(path.join(config.angularNodeModules, ".bin", process.platform === "win32" ? "ng.cmd" : "ng"));
    await rm(nodeModules, { recursive: true, force: true });
    await symlink(config.angularNodeModules, nodeModules, process.platform === "win32" ? "junction" : "dir");
    log.info({ angularDir, source: config.angularNodeModules }, "Linked shared Angular dependencies");
    return;
  }

  log.info({ angularDir }, "Installing Angular dependencies");
  await run("npm", ["install", "--include=dev", "--prefer-offline", "--no-audit", "--no-fund"], { cwd: angularDir });
}

/**
 * Writes the current background-project status to its Supabase job.
 *
 * @param {string} projectDir - Project output directory, used to identify the project.
 * @param {{ status: "processing" | "completed" | "failed", cost?: number, context_length?: number | null, context_window?: number | null, context_percent?: number | null, output_html?: string, error?: string }} status - Status payload.
 * @returns {Promise<void>} Resolves after the job is updated.
 */
async function writeSetupStatus(projectDir: string, status: JobStatus): Promise<void> {
  await writeStatus(projectDir, "setup", status);
}

/** Writes the current HTML-generation status to Supabase. */
async function writeHtmlStatus(projectDir: string, status: JobStatus): Promise<void> {
  await writeStatus(projectDir, "html", status);
}

/** Writes the current Angular-generation status to Supabase. */
async function writeAngularStatus(projectDir: string, status: JobStatus): Promise<void> {
  await writeStatus(projectDir, "angular", status);
}

async function persistProject(projectName: string, jobId: string, projectDir: string): Promise<void> {
  await writePersistStatus(projectDir, { status: "processing", revision_id: jobId });
  await persistProjectArtifact(projectName, jobId, projectDir);
  await writePersistStatus(projectDir, { status: "completed", revision_id: jobId });
}

async function writePersistStatus(projectDir: string, status: JobStatus): Promise<void> {
  await writeStatus(projectDir, "persist", status);
}

/** Updates one revision job in Supabase. */
export async function writeRevisionStatus(
  projectDir: string,
  status: JobStatus & { revision_id: string; request: Revision },
): Promise<void> {
  const { request: _request, ...job } = status;
  await writeStatus(projectDir, "revision", job);
}

/** Writes preview state to the project and its current job. */
async function writeRunStatus(projectDir: string, status: JobStatus): Promise<void> {
  await Promise.all([
    writeStatus(projectDir, "run", status),
    updatePreview(path.basename(projectDir), status),
  ]);
}

async function writeStatus(projectDir: string, stage: ProjectStage, status: JobStatus): Promise<void> {
  const projectName = path.basename(projectDir);
  await updateJobStatus(projectName, stage, status);
}

/**
 * Checks whether a value is safe to use as a single project directory name.
 *
 * @param {unknown} value - Request value to validate.
 * @returns {boolean} Whether the value is a non-empty name without path separators.
 *
 * @example
 * isProjectName("marketing-site"); // true
 * isProjectName("../secrets"); // false
 */
function isProjectName(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "" && !/[\\/]/.test(value) && value !== "." && value !== "..";
}

/**
 * Determines whether a revision presentation requires generated HTML.
 *
 * @param {Interaction["presentation"] | undefined} presentation - Requested revision presentation.
 * @returns {boolean} Whether the presentation needs an HTML reference.
 *
 * @example
 * requiresRevisionHtml("modal"); // true
 */
export function requiresRevisionHtml(presentation: Interaction["presentation"] | undefined): boolean {
  return presentation === "modal" || presentation === "tab" || presentation === "new_page";
}

function parseRevision(value: unknown): Revision | null {
  if (!isRecord(value) || (value.prompt !== null && (typeof value.prompt !== "string" || !value.prompt.trim())) || !Array.isArray(value.comments)) return null;
  const thinkingLevel = value.thinking_level ?? "medium";
  if (thinkingLevel !== "low" && thinkingLevel !== "medium" && thinkingLevel !== "high") return null;
  const comments: RevisionComment[] = [];
  for (const comment of value.comments) {
    if (!isRecord(comment) || typeof comment.comment !== "string" || !comment.comment.trim()) return null;
    if (comment.kind === "element" && (!isRecord(comment.target) || typeof comment.target.selector !== "string" || !comment.target.selector.trim())) return null;
    if ("figma_frame" in comment && "figma_page" in comment) return null;

    const figma = comment.figma_frame ?? comment.figma_page;
    if (figma !== undefined && (!isRecord(figma) || !isNonEmptyString(figma.project_id) || !isNonEmptyString(figma.node_id))) return null;

    const interaction = comment.interaction;
    if (interaction !== undefined && (!isRecord(interaction) || interaction.trigger !== "click" || !["auto", "modal", "tab", "new_page", "popover", "inline"].includes(String(interaction.presentation)))) return null;

    const { figma_page, ...normalized } = comment;
    comments.push({
      ...normalized,
      ...(figma ? { figma_frame: { project_id: figma.project_id, node_id: figma.node_id } } : {}),
      ...(figma_page && !interaction ? { interaction: { trigger: "click", presentation: "auto" } } : {}),
    } as RevisionComment);
  }
  return { ...value, comments, thinking_level: thinkingLevel } as Revision;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

function queuedResponse(projectName: string, projectId: string, jobId: string) {
  return {
    project_id: projectId,
    project_name: projectName,
    job_id: jobId,
    revision_id: jobId,
    status: "queued",
  };
}

export default projectRoutes;
