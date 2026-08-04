/**
 * Builds the R2 prefix for one project's artifacts.
 *
 * @param {string} projectName - Project name.
 * @returns {string} Project artifact prefix.
 *
 * @example
 * artifactPrefix("marketing-site"); // "projects/marketing-site"
 */
export const artifactPrefix = (projectName: string) => `projects/${projectName}`;

/**
 * Builds the R2 object keys for one project's current artifacts.
 *
 * @param {string} projectName - Project name.
 * @returns {{ workspace: string; files: string }} Workspace and file-listing keys.
 *
 * @example
 * artifactKeys("marketing-site").workspace;
 */
export const artifactKeys = (projectName: string) => {
  const prefix = artifactPrefix(projectName);
  return {
    workspace: `${prefix}/workspace.zip`,
    files: `${prefix}/files.json`,
  };
};
