import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { FastifyBaseLogger } from "fastify";
import { Node } from "./types.js";

type Icon = { id: string; name: string; style?: string };

/**
 * Extracts Font Awesome SVGs named in the Figma document into the output folder.
 *
 * @param {Node} node - Cleaned Figma root node.
 * @param {string} outputDir - SVG destination directory.
 * @returns {Promise<void>} Resolves after the SVG manifest is written.
 *
 * @example
 * await extractSvgs(frame, "projects/test/svg");
 */
export async function extractSvgs(node: Node, outputDir: string, log: FastifyBaseLogger): Promise<void> {
  await mkdir(outputDir, { recursive: true });
  const icons = [...walkNodes(node)].map(([item]) => iconFromName(String(item.name ?? ""))).filter((icon): icon is Icon => Boolean(icon));
  const unique = [...new Map(icons.map((icon) => [icon.id, icon])).values()];
  const missing: string[] = [];
  const saved: string[] = [];

  for (const icon of unique) {
    try {
      const svg = await getFontAwesomeSvg(icon);
      const filename = `${icon.id}.svg`.replace(/[^a-zA-Z0-9_.-]/g, "-");
      await writeFile(path.join(outputDir, filename), svg);
      saved.push(filename);
    } catch (error) {
      missing.push(`${icon.id}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  await writeFile(path.join(outputDir, "manifest.json"), JSON.stringify({ icons: saved, missing }, null, 2));
  log.info({ outputDir, saved: saved.length, missing: missing.length }, "SVG extraction completed");
  if (missing.length) log.warn({ missing }, "Some SVGs could not be extracted");
}

function* walkNodes(node: Node): Generator<[Node, string]> {
  yield [node, String(node.name ?? "")];
  for (const child of Array.isArray(node.children) ? node.children : []) {
    if (child && typeof child === "object" && !Array.isArray(child)) yield* walkNodes(child as Node);
  }
}

function iconFromName(name: string): Icon | undefined {
  const parts = name.toLowerCase().split("/");
  const icon = parts.find((part) => /^fa-(?!solid$|regular$|light$|thin$|brands$|duotone$)/.test(part))?.slice(3);
  if (!icon) return undefined;
  const style = parts.find((part) => ["fa-solid", "fa-regular", "fa-light", "fa-thin", "fa-brands", "fa-duotone"].includes(part))?.slice(3).toUpperCase();
  return { id: `${icon}-${style?.toLowerCase() ?? "any"}`, name: icon, style };
}

async function getFontAwesomeSvg(icon: Icon): Promise<string> {
  const token = process.env.FONTAWESOME_API_TOKEN?.trim();
  if (!token) throw new Error("FONTAWESOME_API_TOKEN is required for uncached Font Awesome icons");
  const access = await postJson("https://api.fontawesome.com/token", { Authorization: `Bearer ${token}` });
  const query = `query($name: String!) { release(version: "7.x") { icon(name: $name) { svgs { familyStyle { style } html } } } }`;
  const result = await postJson("https://api.fontawesome.com", { Authorization: `Bearer ${String(access.access_token)}` }, { query, variables: { name: icon.name } });
  const svgs = (((result.data as Node | undefined)?.release as Node | undefined)?.icon as Node | undefined)?.svgs;
  const match = Array.isArray(svgs) ? svgs.find((svg) => !icon.style || String((svg as Node).familyStyle && ((svg as Node).familyStyle as Node).style) === icon.style) ?? svgs[0] : undefined;
  if (!match || typeof (match as Node).html !== "string") throw new Error(`Icon not found: ${icon.name}`);
  return (match as Node).html as string;
}

async function postJson(url: string, headers: Record<string, string>, body?: unknown): Promise<Node> {
  const response = await fetch(url, { method: "POST", headers: { Accept: "application/json", ...headers, ...(body ? { "Content-Type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  return (await response.json()) as Node;
}
