import path from "node:path";

/**
 * Loads the API runtime configuration from environment variables.
 *
 * @type {{ host: string, port: number, projectsRoot: string, scaffoldArchive: string }}
 */
export const config = {
  host: process.env.HOST ?? "0.0.0.0",
  port: Number(process.env.PORT ?? 3000),
  projectsRoot: path.resolve(process.env.PROJECTS_ROOT ?? "./projects"),
  scaffoldArchive: process.env.SCAFFOLD_ARCHIVE ?? path.resolve("scaffolds/frontend-scaffold.zip"),
};
