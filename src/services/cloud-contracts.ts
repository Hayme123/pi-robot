export const artifactPrefix = (projectId: string, jobId: string) => `projects/${projectId}/jobs/${jobId}`;

export const artifactKeys = (projectId: string, jobId: string) => {
  const prefix = artifactPrefix(projectId, jobId);
  return {
    workspace: `${prefix}/workspace.zip`,
    files: `${prefix}/files.json`,
    assets: `${prefix}/assets/`,
  };
};

export const modalJobName = (jobId: string) => `job-${jobId}`;
export const modalPreviewName = (projectId: string) => `preview-${projectId}`;
