import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { FastifyBaseLogger } from "fastify";
import { downloadFrameImage, getNode } from "./client.js";
import { cleanFigmaNode } from "./cleaner.js";
import { extractSvgs } from "./svg.js";
import { Json } from "./types.js";

/**
 * Downloads, cleans, and stores Figma frame data and reference assets.
 *
 * @param {string} fileKey - Figma file key.
 * @param {string[]} nodeIds - Figma frame node IDs.
 * @param {string} outputDir - Project-specific output directory.
 * @returns {Promise<void>} Resolves when all requested frames are saved.
 * @throws {Error} If FIGMA_TOKEN is missing or a Figma request fails.
 *
 * @example
 * await downloadFigmaFrames("abc123", ["3915:181705"], "projects/test");
 */
export async function downloadFigmaFrames(fileKey: string, nodeIds: string[], outputDir: string, log: FastifyBaseLogger): Promise<void> {
  log.info({ frameCount: nodeIds.length, outputDir }, "Starting Figma download");
  const token = process.env.FIGMA_TOKEN?.trim();
  if (!token) throw new Error("FIGMA_TOKEN is required");

  await mkdir(outputDir, { recursive: true });
  for (const [index, rawNodeId] of nodeIds.entries()) {
    const nodeId = rawNodeId.replaceAll("-", ":");
    const suffix = nodeIds.length === 1 ? "" : `-${index + 1}`;
    log.debug({ frame: index + 1, frameCount: nodeIds.length, nodeId }, "Downloading Figma frame");
    const node = await getNode(fileKey, nodeId, token, log);
    const rawJsonPath = path.join(outputDir, `frame_data${suffix}.json`);
    const cleanJsonPath = path.join(outputDir, `frame_data${suffix}_clean.json`);

    await writeFile(rawJsonPath, JSON.stringify(node, null, 2));
    await downloadFrameImage(fileKey, nodeId, token, path.join(outputDir, `frame${suffix}.png`), log);

    const cleaned = cleanFigmaNode(node);
    await writeFile(cleanJsonPath, JSON.stringify(cleaned as Json, null, 2));
    await rm(rawJsonPath);
    await extractSvgs(cleaned as Record<string, unknown>, path.join(outputDir, "svg"), log);
  }
  log.info({ frameCount: nodeIds.length, outputDir }, "Figma download completed");
}
