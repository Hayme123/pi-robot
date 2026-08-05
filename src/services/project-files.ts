import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

export type ProjectFile =
  | { name: string; path: string; type: "directory"; children: ProjectFile[] }
  | { name: string; path: string; type: "file"; content: string };

const excluded = new Set([".angular", ".env", ".npmrc", ".pi-agent", "dist", "node_modules"]);

/**
 * Recursively reads display-safe text files from a project workspace.
 *
 * @param {string} root - Workspace root used for relative paths.
 * @param {string} current - Directory currently being read.
 * @returns {Promise<ProjectFile[]>} Nested source-file tree.
 *
 * @example
 * await readProjectFiles("projects/marketing-site/marketing-site");
 */
export async function readProjectFiles(root: string, current = root): Promise<ProjectFile[]> {
  const entries = await readdir(current, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry): Promise<ProjectFile | null> => {
    if (excluded.has(entry.name) || entry.name.endsWith(".log")) return null;
    const filePath = path.join(current, entry.name);
    const relativePath = path.relative(root, filePath).split(path.sep).join("/");
    if (entry.isDirectory()) return { name: entry.name, path: relativePath, type: "directory", children: await readProjectFiles(root, filePath) };
    if (!entry.isFile()) return null;
    const content = await readFile(filePath);
    if (content.includes(0)) return null;
    return { name: entry.name, path: relativePath, type: "file", content: content.toString("utf8") };
  }));
  return files.filter((file): file is ProjectFile => file !== null);
}
