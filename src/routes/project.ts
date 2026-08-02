import { execFile, spawn, type ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";
import { access, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import type { FastifyBaseLogger, FastifyPluginAsync } from "fastify";
import { config } from "../config.js";
import { downloadFigmaFrames } from "../services/figma.js";
import { applyProjectRevision, defineProjectName, generateAngularProject, generateProjectHtml, generatePromptProject } from "../services/pi.js";
import {
  publishProjectEvent,
  subscribeProjectEvents,
  type ProjectStage,
} from "../services/project-events.js";

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
  const runningProjects = new Map<string, Promise<RunningProject>>();

  app.addHook("onClose", async () => {
    app.log.info({ runningProjects: runningProjects.size }, "Stopping project processes");
    const projects = await Promise.allSettled(runningProjects.values());
    for (const project of projects) {
      if (project.status === "fulfilled") {
        project.value.angular.kill();
        project.value.tunnel.kill();
      }
    }
  });

  app.get<{ Params: { projectName: string } }>(
    "/ws/projects/:projectName",
    { websocket: true },
    (socket, request) => {
      const { projectName } = request.params;
      if (!isProjectName(projectName)) {
        socket.close(1008, "Invalid project name");
        return;
      }

      const unsubscribe = subscribeProjectEvents(projectName, socket);
      socket.once("close", unsubscribe);
      void sendStatusSnapshot(projectName, socket, request.log);
    },
  );

  app.get("/projects", async () => {
    const projectNames = (await readdir(config.projectsRoot, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
    return {
      projects: await Promise.all(projectNames.map(async (projectName) => ({
        project_name: projectName,
        statuses: await readProjectStatuses(path.join(config.projectsRoot, projectName)),
      }))),
    };
  });

  app.get<{ Params: { projectName: string } }>("/project/:projectName/download", async (request, reply) => {
    const { projectName } = request.params;
    if (!isProjectName(projectName)) {
      return reply.code(400).send({ error: "project_name must be a folder name" });
    }

    const angularDir = path.join(config.projectsRoot, projectName, projectName);
    try {
      await access(path.join(angularDir, "angular.json"));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return reply.code(404).send({ error: "Angular source not found" });
      }
      throw error;
    }

    const archive = spawn("zip", ["-qr", "-", ".", "-x", "node_modules/*", ".angular/*", "dist/*", ".env"], {
      cwd: angularDir,
      stdio: ["ignore", "pipe", "pipe"],
    });
    await new Promise<void>((resolve, reject) => {
      archive.once("spawn", resolve);
      archive.once("error", reject);
    });
    archive.stderr?.on("data", (chunk) => request.log.warn({ output: String(chunk).trim() }, "Zip output"));
    reply.raw.once("close", () => archive.kill());
    return reply
      .header("Content-Type", "application/zip")
      .header("Content-Disposition", `attachment; filename="${projectName}.zip"`)
      .send(archive.stdout);
  });

  app.get<{ Params: { projectName: string } }>("/project/:projectName/files", async (request, reply) => {
    const { projectName } = request.params;
    if (!isProjectName(projectName)) {
      return reply.code(400).send({ error: "project_name must be a folder name" });
    }

    const angularDir = path.join(config.projectsRoot, projectName, projectName);
    try {
      await access(path.join(angularDir, "angular.json"));
      return { project_name: projectName, files: await readAngularFiles(angularDir) };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return reply.code(404).send({ error: "Angular source not found" });
      }
      throw error;
    }
  });

  app.get<{ Params: { projectName: string } }>("/project/:projectName", async (request, reply) => {
    const { projectName } = request.params;
    if (!isProjectName(projectName)) {
      return reply.code(400).send({ error: "project_name must be a folder name" });
    }

    const projectDir = path.join(config.projectsRoot, projectName);
    try {
      await access(projectDir);
      return { project_name: projectName, statuses: await readProjectStatuses(projectDir) };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return reply.code(404).send({ error: "Project not found" });
      }
      throw error;
    }
  });

  app.post<{ Body: PromptProjectBody }>("/project/prompt", { schema: promptProjectSchema }, async (request, reply) => {
    const prompt = request.body?.prompt;
    if (typeof prompt !== "string" || !prompt.trim()) {
      return reply.code(400).send({ error: "prompt must be a non-empty string" });
    }

    const existingNames = (await readdir(config.projectsRoot, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
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

    await writeSetupStatus(projectDir, { status: "processing" });
    void (async () => {
      let writeFailure = writeSetupStatus;
      try {
        await extractScaffold(angularDir, request.log);
        await writeSetupStatus(projectDir, { status: "completed" });

        writeFailure = writeAngularStatus;
        await writeAngularStatus(projectDir, { status: "processing" });
        await run("npm", ["install", "--include=dev"], { cwd: angularDir });
        const usage = await generatePromptProject(prompt.trim(), angularDir, request.log);
        await writeAngularStatus(projectDir, {
          status: "completed",
          cost: usage.cost,
          context_length: usage.contextLength,
          context_window: usage.contextWindow,
          context_percent: usage.contextPercent,
        });

        writeFailure = writeRunStatus;
        await writeRunStatus(projectDir, { status: "processing" });
        const { url } = await ensureRunningProject(projectName, angularDir, runningProjects, app.log);
        await writeRunStatus(projectDir, { status: "completed", url });
        app.log.info({ projectName, url }, "Prompt-generated project is publicly available");
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await writeFailure(projectDir, { status: "failed", error: message });
        app.log.error(error, `Prompt project generation failed: ${projectName}`);
      }
    })();

    return reply.code(202).send({ project_name: projectName, status: "processing" });
  });

  app.post<{ Body: CreateProjectBody }>("/project/all", { schema: createProjectSchema }, async (request, reply) => {
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

    await writeSetupStatus(projectDir, { status: "processing" });
    void (async () => {
      let writeFailure = writeSetupStatus;
      try {
        await createProjectFiles(
          projectDir,
          angularDir,
          String(request.body.file_key),
          request.body.node_ids ?? [],
          request.log,
        );
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

        writeFailure = writeAngularStatus;
        await writeAngularStatus(projectDir, { status: "processing" });
        await run("npm", ["install", "--include=dev"], { cwd: angularDir });
        const angular = await generateAngularProject(projectDir, angularDir, request.log);
        await writeAngularStatus(projectDir, {
          status: "completed",
          cost: angular.cost,
          context_length: angular.contextLength,
          context_window: angular.contextWindow,
          context_percent: angular.contextPercent,
        });

        writeFailure = writeRunStatus;
        await writeRunStatus(projectDir, { status: "processing" });
        const { url } = await ensureRunningProject(projectName, angularDir, runningProjects, app.log);
        await writeRunStatus(projectDir, { status: "completed", url });
        app.log.info({ projectName, url }, "Full project pipeline completed");
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await writeFailure(projectDir, { status: "failed", error: message });
        app.log.error(error, `Full project pipeline failed: ${projectName}`);
      }
    })();

    return reply.code(202).send({ project_name: projectName, status: "processing" });
  });

  app.post<{ Body: CreateProjectBody }>("/project", { schema: createProjectSchema }, async (request, reply) => {
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

    await writeSetupStatus(projectDir, { status: "processing" });
    void createProjectFiles(projectDir, scaffoldDir, String(request.body.file_key), request.body.node_ids ?? [], request.log)
      .then(async () => {
        await writeSetupStatus(projectDir, { status: "completed" });
        request.log.info({ projectName }, "Project setup completed");
      })
      .catch(async (error) => {
        await writeSetupStatus(projectDir, { status: "failed", error: error instanceof Error ? error.message : String(error) });
        app.log.error(error, `Project setup failed: ${projectName}`);
      });

    request.log.info({ projectName }, "Project creation queued");
    return reply.code(202).send({ project_name: projectName, status: "processing" });
  });

  /**
   * Starts background HTML generation from a prepared project's Figma reference files.
   *
   * @param {import("fastify").FastifyRequest} request - Request containing the project name.
   * @param {import("fastify").FastifyReply} reply - Reply used to send the job status.
   * @returns {Promise<{ project_name: string, status: string }>} Accepted HTML generation job.
   */
  app.post<{ Params: { projectName: string } }>("/project/:projectName/html", async (request, reply) => {
    const { projectName } = request.params;
    if (!isProjectName(projectName)) {
      request.log.warn("Rejected HTML generation with an invalid project name");
      return reply.code(400).send({ error: "project_name must be a folder name" });
    }

    request.log.info({ projectName }, "Starting HTML generation request");
    const projectDir = path.join(config.projectsRoot, projectName);
    const scaffoldDir = path.join(projectDir, projectName);
    try {
      await Promise.all([
        access(path.join(projectDir, "frame_data_clean.json")),
        access(path.join(projectDir, "frame.png")),
        access(path.join(projectDir, "svg")),
        access(scaffoldDir),
      ]);
    } catch {
      request.log.warn({ projectName }, "HTML generation inputs were not found");
      return reply.code(404).send({ error: "Project setup or Figma reference files were not found" });
    }

    await writeHtmlStatus(projectDir, { status: "processing" });
    void generateProjectHtml(projectDir, scaffoldDir, request.log)
      .then(async ({ cost, contextLength, contextWindow, contextPercent }) => {
        await writeHtmlStatus(projectDir, {
          status: "completed",
          cost,
          context_length: contextLength,
          context_window: contextWindow,
          context_percent: contextPercent,
          output_html: "index.html",
        });
        request.log.info({ projectName, cost }, "HTML generation job completed");
      })
      .catch(async (error) => {
        await writeHtmlStatus(projectDir, { status: "failed", error: error instanceof Error ? error.message : String(error) });
        app.log.error(error, `HTML generation failed: ${projectName}`);
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
  app.post<{ Params: { projectName: string } }>("/project/:projectName/angular", async (request, reply) => {
    const { projectName } = request.params;
    if (!isProjectName(projectName)) {
      request.log.warn("Rejected Angular generation with an invalid project name");
      return reply.code(400).send({ error: "project_name must be a folder name" });
    }

    request.log.info({ projectName }, "Starting Angular generation request");
    const projectDir = path.join(config.projectsRoot, projectName);
    const angularDir = path.join(projectDir, projectName);
    try {
      await Promise.all([
        access(path.join(projectDir, "index.html")),
        access(path.join(projectDir, "frame.png")),
        access(angularDir),
      ]);
    } catch {
      request.log.warn({ projectName }, "Angular generation inputs were not found");
      return reply.code(404).send({ error: "Project HTML, image, or Angular scaffold was not found" });
    }

    await writeAngularStatus(projectDir, { status: "processing" });
    request.log.info({ projectName }, "Installing Angular project dependencies");
    void run("npm", ["install", "--include=dev"], { cwd: angularDir })
      .then(() => {
        request.log.info({ projectName }, "Angular project dependencies installed");
        return generateAngularProject(projectDir, angularDir, request.log);
      })
      .then(async ({ cost, contextLength, contextWindow, contextPercent }) => {
        await writeAngularStatus(projectDir, {
          status: "completed",
          cost,
          context_length: contextLength,
          context_window: contextWindow,
          context_percent: contextPercent,
        });
        request.log.info({ projectName, cost }, "Angular generation job completed");
      })
      .catch(async (error) => {
        await writeAngularStatus(projectDir, { status: "failed", error: error instanceof Error ? error.message : String(error) });
        app.log.error(error, `Angular generation failed: ${projectName}`);
      });
    request.log.info({ projectName }, "Angular generation queued");
    return reply.code(202).send({ project_name: projectName, status: "processing" });
  });

  app.post<{ Params: { projectName: string }; Body: unknown }>("/project/:projectName/revisions", async (request, reply) => {
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
      return reply.code(404).send({ error: "Project not found" });
    }

    const revisionId = randomUUID();
    const assetsDir = path.join(projectDir, ".revision-assets", revisionId);
    await writeRevisionStatus(projectDir, { revision_id: revisionId, request: revision, status: "processing" });

    void (async () => {
      try {
        const figmaFrames = [] as { commentId: string | number; directory: string; htmlPath?: string }[];
        let htmlCost = 0;
        for (const [index, comment] of revision.comments.entries()) {
          if (!comment.figma_frame) continue;
          const directory = path.join(assetsDir, String(index));
          await downloadFigmaFrames(comment.figma_frame.project_id, [comment.figma_frame.node_id], directory, request.log);
          let htmlPath: string | undefined;
          if (requiresRevisionHtml(comment.interaction?.presentation)) {
            const usage = await generateProjectHtml(directory, angularDir, request.log);
            htmlCost += usage.cost;
            htmlPath = path.join(directory, "index.html");
          }
          figmaFrames.push({ commentId: comment.id ?? index, directory, ...(htmlPath ? { htmlPath } : {}) });
        }
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
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await writeRevisionStatus(projectDir, { revision_id: revisionId, request: revision, status: "failed", error: message });
        app.log.error(error, `Project revision failed: ${projectName}`);
        return;
      }

      await writeRunStatus(projectDir, { revision_id: revisionId, status: "processing" });
      try {
        const { url } = await restartRunningProject(projectName, angularDir, runningProjects, app.log);
        await writeRunStatus(projectDir, { revision_id: revisionId, status: "completed", url });
        app.log.info({ projectName, revisionId, url }, "Revised project is publicly available");
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await writeRunStatus(projectDir, { revision_id: revisionId, status: "failed", error: message });
        app.log.error(error, `Revised project launch failed: ${projectName}`);
      }
    })();

    return reply.code(202).send({ revision_id: revisionId, status: "processing" });
  });

  app.post<{ Params: { projectName: string } }>("/project/:projectName/stop", async (request, reply) => {
    const { projectName } = request.params;
    if (!isProjectName(projectName)) {
      return reply.code(400).send({ error: "project_name must be a folder name" });
    }

    const running = runningProjects.get(projectName);
    if (!running) return reply.code(404).send({ error: "Project is not running" });

    try {
      const { angular, tunnel } = await running;
      tunnel.kill();
      angular.kill();
      runningProjects.delete(projectName);
      request.log.info({ projectName }, "Project tunnel stopped");
      return { project_name: projectName, status: "stopped" };
    } catch {
      runningProjects.delete(projectName);
      return reply.code(404).send({ error: "Project is not running" });
    }
  });

  app.post("/projects/run", async () => {
    const projectNames = (await readdir(config.projectsRoot, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();

    const projects = await Promise.all(projectNames.map(async (projectName) => {
      const projectDir = path.join(config.projectsRoot, projectName);
      const angularDir = path.join(projectDir, projectName);
      try {
        await Promise.all([
          access(path.join(angularDir, "angular.json")),
          access(path.join(angularDir, "node_modules", ".bin", process.platform === "win32" ? "ng.cmd" : "ng")),
        ]);
      } catch {
        return { project_name: projectName, status: "skipped", error: "Built Angular project was not found" };
      }

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

  app.post<{ Params: { projectName: string } }>("/project/:projectName/run", async (request, reply) => {
    const { projectName } = request.params;
    if (!isProjectName(projectName)) {
      request.log.warn("Rejected project launch with an invalid project name");
      return reply.code(400).send({ error: "project_name must be a folder name" });
    }

    request.log.info({ projectName }, "Launching project");
    const angularDir = path.join(config.projectsRoot, projectName, projectName);
    try {
      await Promise.all([
        access(path.join(angularDir, "angular.json")),
        access(path.join(angularDir, "node_modules", ".bin", process.platform === "win32" ? "ng.cmd" : "ng")),
      ]);
    } catch {
      request.log.warn({ projectName }, "Built Angular project was not found");
      return reply.code(404).send({ error: "Built Angular project was not found" });
    }

    const projectDir = path.dirname(angularDir);
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
};

type RunningProject = { angular: ChildProcess; tunnel: ChildProcess; url: string };

async function restartRunningProject(
  projectName: string,
  angularDir: string,
  runningProjects: Map<string, Promise<RunningProject>>,
  log: FastifyBaseLogger,
): Promise<RunningProject> {
  const running = runningProjects.get(projectName);
  runningProjects.delete(projectName);
  if (running) {
    try {
      const { angular, tunnel } = await running;
      tunnel.kill();
      angular.kill();
    } catch {}
  }
  return ensureRunningProject(projectName, angularDir, runningProjects, log);
}

function ensureRunningProject(
  projectName: string,
  angularDir: string,
  runningProjects: Map<string, Promise<RunningProject>>,
  log: FastifyBaseLogger,
): Promise<RunningProject> {
  let running = runningProjects.get(projectName);
  if (running) return running;

  running = startAngularTunnel(angularDir, log);
  runningProjects.set(projectName, running);
  const current = running;
  const forget = () => runningProjects.get(projectName) === current && runningProjects.delete(projectName);
  void current
    .then(({ angular, tunnel }) => {
      angular.once("exit", (code, signal) => {
        log.warn({ projectName, code, signal }, "Angular process stopped");
        tunnel.kill();
        forget();
      });
      tunnel.once("exit", (code, signal) => {
        log.warn({ projectName, code, signal }, "Cloudflare tunnel stopped");
        angular.kill();
        forget();
      });
    })
    .catch(forget);
  return running;
}

async function startAngularTunnel(angularDir: string, log: FastifyBaseLogger): Promise<RunningProject> {
  const port = await getFreePort();
  log.info({ angularDir, port }, "Starting Angular development server");
  const ng = path.join(angularDir, "node_modules", ".bin", process.platform === "win32" ? "ng.cmd" : "ng");
  const angular = spawn(ng, ["serve", "--host", "127.0.0.1", "--port", String(port), "--allowed-hosts"], { cwd: angularDir });
  angular.stdout?.on("data", (chunk) => log.debug({ output: String(chunk).trim() }, "Angular output"));
  angular.stderr?.on("data", (chunk) => log.debug({ output: String(chunk).trim() }, "Angular error output"));

  try {
    await waitForUrl(`http://127.0.0.1:${port}`, angular, 120_000);
    log.info({ port }, "Angular development server is ready");
    const tunnel = spawn("cloudflared", [
      "tunnel",
      "--no-autoupdate",
      "--url",
      `http://127.0.0.1:${port}`,
      "--http-host-header",
      `127.0.0.1:${port}`,
    ]);
    const url = await waitForTunnelUrl(tunnel, 30_000, log);
    log.info({ url }, "Cloudflare tunnel is ready");
    return { angular, tunnel, url };
  } catch (error) {
    angular.kill();
    throw error;
  }
}

async function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close(() => typeof address === "object" && address ? resolve(address.port) : reject(new Error("No free port")));
    });
  });
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

function waitForTunnelUrl(
  tunnel: ChildProcess,
  timeoutMs: number,
  log: FastifyBaseLogger,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => finish(new Error("Cloudflare tunnel did not return a URL in time")), timeoutMs);
    let output = "";
    const finish = (error?: Error, url?: string) => {
      clearTimeout(timeout);
      tunnel.stderr?.off("data", onData);
      tunnel.off("error", onError);
      tunnel.off("exit", onExit);
      if (error) {
        tunnel.kill();
        reject(error);
      } else {
        resolve(url!);
      }
    };
    const onData = (chunk: Buffer) => {
      const text = String(chunk);
      output += text;
      log.debug({ output: text.trim() }, "Cloudflare output");
      const url = output.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/i)?.[0];
      if (url) finish(undefined, url);
    };
    const onError = (error: Error) => finish(error);
    const onExit = (code: number | null) => finish(new Error(`Cloudflare tunnel stopped with code ${code}`));
    tunnel.stderr?.on("data", onData);
    tunnel.once("error", onError);
    tunnel.once("exit", onExit);
  });
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
  await extractScaffold(scaffoldDir, log);
  await downloadFigmaFrames(fileKey, nodeIds, projectDir, log);
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

/**
 * Writes the current background-project status to its project directory.
 *
 * @param {string} projectDir - Project output directory.
 * @param {{ status: "processing" | "completed" | "failed", cost?: number, context_length?: number | null, context_window?: number | null, context_percent?: number | null, output_html?: string, error?: string }} status - Status payload.
 * @returns {Promise<void>} Resolves after the status file is written.
 */
async function writeSetupStatus(projectDir: string, status: JobStatus): Promise<void> {
  await writeStatus(projectDir, "status_setup.json", "setup", status);
}

/** Writes the current HTML-generation status to its project directory. */
async function writeHtmlStatus(projectDir: string, status: JobStatus): Promise<void> {
  await writeStatus(projectDir, "status_html.json", "html", status);
}

/** Writes the current Angular-generation status to its project directory. */
async function writeAngularStatus(projectDir: string, status: JobStatus): Promise<void> {
  await writeStatus(projectDir, "status_angular.json", "angular", status);
}

/** Appends or updates one request in the project's revision history. */
export async function writeRevisionStatus(
  projectDir: string,
  status: JobStatus & { revision_id: string; request: Revision },
): Promise<void> {
  const statusPath = path.join(projectDir, "status_revision.json");
  let requests: Record<string, unknown>[] = [];
  try {
    const saved = JSON.parse(await readFile(statusPath, "utf8")) as Record<string, unknown>;
    if (Array.isArray(saved.request)) requests = saved.request.filter(isRecord);
    else if (isRecord(saved.request) && typeof saved.revision_id === "string") {
      const { request, ...legacyStatus } = saved;
      requests = [{ ...request, ...legacyStatus }];
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }

  const { request, ...job } = status;
  const updated_at = new Date().toISOString();
  const entry = { ...request, ...job, updated_at };
  const index = requests.findIndex((item) => item.revision_id === status.revision_id);
  if (index === -1) requests.push(entry);
  else requests[index] = entry;
  await writeFile(statusPath, JSON.stringify({ request: requests }, null, 2));
  publishProjectEvent({ type: "job.status", project_name: path.basename(projectDir), stage: "revision", ...job, updated_at });
}

/** Writes the current Angular-server status to its project directory. */
async function writeRunStatus(projectDir: string, status: JobStatus): Promise<void> {
  await writeStatus(projectDir, "status_run.json", "run", status);
}

async function writeStatus(
  projectDir: string,
  fileName: string,
  stage: ProjectStage,
  status: JobStatus,
): Promise<void> {
  const savedStatus = { ...status, updated_at: new Date().toISOString() };
  await writeFile(path.join(projectDir, fileName), JSON.stringify(savedStatus, null, 2));
  publishProjectEvent({
    type: "job.status",
    project_name: path.basename(projectDir),
    stage,
    ...savedStatus,
  });
}

type AngularFile =
  | { name: string; path: string; type: "directory"; children: AngularFile[] }
  | { name: string; path: string; type: "file"; content: string };

async function readAngularFiles(angularDir: string, currentDir = angularDir): Promise<AngularFile[]> {
  const entries = await readdir(currentDir, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry): Promise<AngularFile | null> => {
    if ([".angular", "dist", "node_modules"].includes(entry.name) || entry.name === ".env") return null;
    const filePath = path.join(currentDir, entry.name);
    const relativePath = path.relative(angularDir, filePath).split(path.sep).join("/");
    if (entry.isDirectory()) {
      return { name: entry.name, path: relativePath, type: "directory", children: await readAngularFiles(angularDir, filePath) };
    }
    if (!entry.isFile()) return null;
    const content = await readFile(filePath);
    if (content.includes(0)) return null;
    return { name: entry.name, path: relativePath, type: "file", content: content.toString("utf8") };
  }));
  return files.filter((file): file is AngularFile => file !== null);
}

const statusFiles: [ProjectStage, string][] = [
  ["setup", "status_setup.json"],
  ["html", "status_html.json"],
  ["angular", "status_angular.json"],
  ["revision", "status_revision.json"],
  ["run", "status_run.json"],
];

async function readProjectStatuses(projectDir: string): Promise<Partial<Record<ProjectStage, (JobStatus & { updated_at: string }) | { request: Record<string, unknown>[] }>>> {
  const statuses: Partial<Record<ProjectStage, (JobStatus & { updated_at: string }) | { request: Record<string, unknown>[] }>> = {};
  await Promise.all(statusFiles.map(async ([stage, fileName]) => {
    try {
      statuses[stage] = JSON.parse(await readFile(path.join(projectDir, fileName), "utf8"));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }));
  return statuses;
}

async function sendStatusSnapshot(
  projectName: string,
  socket: { readyState: number; send(message: string): void },
  log: FastifyBaseLogger,
): Promise<void> {
  const projectDir = path.join(config.projectsRoot, projectName);

  await Promise.all(statusFiles.map(async ([stage, fileName]) => {
    try {
      const status = JSON.parse(await readFile(path.join(projectDir, fileName), "utf8")) as JobStatus & { updated_at: string; request?: Record<string, unknown>[] };
      if (socket.readyState !== 1) return;
      if (stage === "revision" && Array.isArray(status.request)) {
        for (const entry of status.request) {
          socket.send(JSON.stringify({ ...entry, type: "job.status", project_name: projectName, stage }));
        }
      } else {
        socket.send(JSON.stringify({ ...status, type: "job.status", project_name: projectName, stage }));
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        log.warn({ error, projectName, fileName }, "Could not send project status snapshot");
      }
    }
  }));
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

export default projectRoutes;
