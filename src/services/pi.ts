import { execFile } from "node:child_process";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import {
  createAgentSession,
  DefaultResourceLoader,
  getAgentDir,
  ModelRuntime,
  SessionManager,
  type AgentSession,
} from "@earendil-works/pi-coding-agent";
import type { FastifyBaseLogger } from "fastify";
import { createFigmaDesignSpec } from "./figma/cleaner.js";

const run = promisify(execFile);

let modelRuntime: Promise<ModelRuntime> | undefined;
type Usage = { cost: number; contextLength: number | null; contextWindow: number | null; contextPercent: number | null };
type RevisionResult = Usage & { summary: string };

/**
 * Prompts Pi to create HTML from a project's downloaded Figma files.
 *
 * @param {string} projectDir - Directory containing the Figma JSON, PNG, and SVGs.
 * @param {string} scaffoldDir - Frontend scaffold working directory.
 * @returns {Promise<Usage>} Pi usage after HTML generation.
 * @throws {Error} If Pi cannot create or complete the agent session.
 */
export async function generateProjectHtml(projectDir: string, scaffoldDir: string, log: FastifyBaseLogger): Promise<Usage> {
  log.info({ projectDir }, "Starting HTML generation");
  const designSpecPath = path.join(projectDir, "design_spec.json");
  const figma = JSON.parse(await readFile(path.join(projectDir, "frame_data_clean.json"), "utf8"));
  await writeFile(designSpecPath, JSON.stringify(createFigmaDesignSpec(figma), null, 2));
  const session = await createProjectSession(scaffoldDir, "medium", log);
  try {
    await session.prompt([
      "Use the html skill to generate the requested static interface. Create index.html and styles.css beside the requested output HTML. Do not create JavaScript.",
      `design_spec_path: ${designSpecPath}`,
      `image_path: ${projectDir}/frame.png`,
      `svg_path: ${projectDir}/svg`,
      `output_html_path: ${projectDir}/index.html`,
      "Write formatted code directly. After generating index.html and styles.css, do not make further edits or checks; reply done immediately.",
    ].join("\n"));
    const usage = getUsage(session);
    log.info({ projectDir, ...usage }, "HTML generation completed");
    return usage;
  } finally {
    session.dispose();
  }
}

/**
 * Prompts Pi to convert a generated HTML reference into the project's Angular app.
 *
 * @param {string} projectDir - Directory containing the generated HTML and Figma image.
 * @param {string} angularDir - Existing Angular project directory.
 * @returns {Promise<Usage>} Pi usage after Angular generation.
 * @throws {Error} If Pi cannot create or complete the agent session.
 */
export async function generateAngularProject(projectDir: string, angularDir: string, log: FastifyBaseLogger): Promise<Usage> {
  log.info({ angularDir }, "Starting Angular generation");
  const iconIds = await generateIconSprite(path.join(projectDir, "svg"), angularDir);
  const session = await createProjectSession(angularDir, "high", log);
  try {
    await session.prompt([
      "Use the angular-developer skill to recreate the supplied HTML as the existing Angular application.",
      `html_path: ${projectDir}/index.html`,
      `image_path: ${projectDir}/frame.png`,
      `angular_project_path: ${angularDir}`,
      `icon_sprite_path: ${angularDir}/src/assets/icons/icons-sprite.svg`,
      `Prebuilt sprite IDs: ${iconIds.join(", ")}. Use a matching prebuilt ID when available. If none matches a required icon, add one faithful SVG <symbol> with a unique kebab-case ID to icon_sprite_path. Never use text, Unicode symbols, or emoji as icons, and do not alter existing symbols. Reference icons as assets/icons/icons-sprite.svg#<id> without searching source SVGs.`,
      "Dependencies are already installed. Never run npm install, npm ci, add packages, or run Prettier; the backend formats files after generation. Before coding, map every visual control and data display to Component Pantry and use the matching NTV component; do not force Pantry components for semantic text, structure, links, images, or SVGs that have no match. Keep every SCSS @apply declaration on one line. Implement shell/header/metrics first, then analytics/table/toolbar. Allow one visual-fidelity fix batch before validation, then build. After the first successful final npm run build, reply done immediately and make no further tool calls, edits, installs, checks, or rebuilds.",
    ].join("\n"));
    await formatAngularProject(angularDir, log);
    const usage = getUsage(session);
    log.info({ angularDir, ...usage }, "Angular generation completed");
    return usage;
  } finally {
    session.dispose();
  }
}

/** Lets Pi choose a safe folder name for a prompt-generated project. */
export async function defineProjectName(prompt: string, projectsRoot: string, existingNames: string[], log: FastifyBaseLogger): Promise<string> {
  const session = await createProjectSession(projectsRoot, "low", log);
  try {
    await session.prompt([
      "Choose a concise project name for the requested application.",
      `Request: ${prompt}`,
      `Names already in use: ${existingNames.join(", ") || "none"}`,
      "Reply with only one unused lowercase kebab-case folder name, using 1 to 64 ASCII letters, numbers, or hyphen characters. Do not use markdown or explanation.",
    ].join("\n"));
    const projectName = session.getLastAssistantText()?.trim() ?? "";
    if (!/^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/.test(projectName) || existingNames.includes(projectName)) {
      throw new Error("Pi did not return a valid unused project name");
    }
    return projectName;
  } finally {
    session.dispose();
  }
}

/** Creates an Angular application directly from a text prompt without visual reference files. */
export async function generatePromptProject(prompt: string, angularDir: string, log: FastifyBaseLogger): Promise<Usage> {
  log.info({ angularDir }, "Starting prompt-only Angular generation");
  const session = await createProjectSession(angularDir, "high", log);
  try {
    await session.prompt([
      "Use the angular-developer skill to build the requested application in the existing Angular project.",
      `User prompt: ${prompt}`,
      `Angular project path: ${angularDir}`,
      "This is prompt-only generation. Ignore scaffold placeholder content and do not look for or wait for input frames, images, HTML, Figma data, SVG references, or other visual inputs. Design and implement the application using only the user prompt. Dependencies are already installed; do not install packages. Run npm run build once after editing. After the first successful build, reply done immediately and make no further edits or tool calls.",
    ].join("\n"));
    await formatAngularProject(angularDir, log);
    const usage = getUsage(session);
    log.info({ angularDir, ...usage }, "Prompt-only Angular generation completed");
    return usage;
  } finally {
    session.dispose();
  }
}

/** Applies review comments to an existing Angular project. */
export async function applyProjectRevision(
  angularDir: string,
  revision: unknown,
  figmaFrames: { commentId: string | number; directory: string; htmlPath?: string }[],
  thinkingLevel: "low" | "medium" | "high",
  log: FastifyBaseLogger,
): Promise<RevisionResult> {
  log.info({ angularDir, thinkingLevel }, "Starting project revision");
  const session = await createProjectSession(angularDir, thinkingLevel, log);
  const startingCost = getUsage(session).cost;
  try {
    await session.prompt([
      "Use the angular-developer skill to apply this revision to the existing Angular application.",
      `Angular project (the only folder you may modify): ${angularDir}`,
      `Revision: ${JSON.stringify(revision)}`,
      `Attached Figma references (read-only): ${JSON.stringify(figmaFrames)}`,
      "Apply the top-level prompt even when comments is empty. Treat each figma_frame as a visual reference for that comment, not as an automatic request for a new page. For modal, tab, and new_page references, read the backend-generated htmlPath and adjacent styles.css first and use them as the primary implementation source; use the frame image only as a visual cross-check. Follow the comment and interaction.presentation: auto means infer the appropriate UI from the instruction and existing application; modal, tab, new_page, popover, and inline are explicit. Connect the target identified by target.selector/component/tag/text using interaction.trigger when provided. Create a route only for new_page or when the comment explicitly requests navigation. Apply comments without figma_frame normally. Do not modify files outside the Angular project. Dependencies are installed; do not install packages. Run npm run build once after editing. When it succeeds, your final response must be a concise, specific summary of the changes you made; never respond with only done or completed.",
    ].join("\n"));
    const usage = getUsage(session);
    return {
      ...usage,
      cost: usage.cost - startingCost,
      summary: session.getLastAssistantText()?.trim() || "Revision completed.",
    };
  } finally {
    session.dispose();
  }
}

/**
 * Creates a configured Pi session for one project workspace.
 *
 * @param {string} cwd - Agent working directory.
 * @param {"low" | "medium" | "high"} thinkingLevel - Reasoning level for the generation task.
 * @param {{ modelId?: string }} options - Session-specific options.
 * @returns {Promise<AgentSession>} Configured Pi session.
 */
async function createProjectSession(
  cwd: string,
  thinkingLevel: "low" | "medium" | "high",
  log: FastifyBaseLogger,
  { modelId = "gpt-5.6-luna" }: { modelId?: string } = {},
): Promise<AgentSession> {
  log.debug({ cwd, thinkingLevel }, "Creating Pi session");
  const loader = new DefaultResourceLoader({ cwd, agentDir: getAgentDir() });
  await loader.reload();

  const runtime = await (modelRuntime ??= ModelRuntime.create());
  const model = runtime.getModel("openai-codex", modelId);
  if (!model) throw new Error(`Model openai/${modelId} is unavailable`);

  const openSession = (sessionManager: SessionManager) => createAgentSession({
    cwd,
    modelRuntime: runtime,
    model,
    thinkingLevel,
    resourceLoader: loader,
    sessionManager,
    tools: ["read", "write", "edit", "bash", "grep", "find", "ls"],
  });

  const { session } = await openSession(SessionManager.create(cwd));
  return session;
}

async function formatAngularProject(angularDir: string, log: FastifyBaseLogger): Promise<void> {
  const prettier = path.join(angularDir, "node_modules", ".bin", process.platform === "win32" ? "prettier.cmd" : "prettier");
  log.info({ angularDir }, "Formatting Angular files with Prettier");
  await run(prettier, ["--write", "src/**/*.{html,ts,scss,css}"], { cwd: angularDir });
  log.info({ angularDir }, "Angular files formatted");
}

async function generateIconSprite(svgDir: string, angularDir: string): Promise<string[]> {
  const symbols = new Map<string, string>();
  const addSymbol = (id: string, source: string) => {
    const root = source.match(/<svg\b([^>]*)>/i);
    const viewBox = root?.[1].match(/viewBox\s*=\s*["']([^"']+)["']/i)?.[1];
    const body = source.replace(/^[\s\S]*?<svg\b[^>]*>/i, "").replace(/<\/svg>\s*$/i, "").trim();
    if (!viewBox || !body) throw new Error(`Invalid SVG for ${id}`);
    symbols.set(id, `<symbol id="${id}" viewBox="${viewBox}">${body}</symbol>`);
  };

  const iconFiles = (await readdir(svgDir)).filter((file) => file.endsWith(".svg")).sort();
  for (const file of iconFiles) {
    addSymbol(path.basename(file, ".svg"), await readFile(path.join(svgDir, file), "utf8"));
  }

  const defaults = await readFile(path.join(getAgentDir(), "skills", "html", "icons", "icons-sprite.svg"), "utf8");
  for (const id of ["ncompasstv-logo", "ntv360-logo", "ncompass-cursor"]) {
    const symbol = defaults.match(new RegExp(`<symbol\\s+id="${id}"[\\s\\S]*?<\\/symbol>`))?.[0];
    if (!symbol) throw new Error(`Default icon ${id} was not found`);
    symbols.set(id, symbol);
  }

  const output = path.join(angularDir, "src", "assets", "icons", "icons-sprite.svg");
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, `<svg xmlns="http://www.w3.org/2000/svg">\n  ${[...symbols.values()].join("\n  ")}\n</svg>\n`);
  return [...symbols.keys()];
}

function getUsage(session: AgentSession): Usage {
  const stats = session.getSessionStats();
  return {
    cost: stats.cost,
    contextLength: stats.contextUsage?.tokens ?? null,
    contextWindow: stats.contextUsage?.contextWindow ?? null,
    contextPercent: stats.contextUsage?.percent ?? null,
  };
}
