export type ProjectStage = "setup" | "html" | "angular" | "revision" | "run";

export type ProjectJobEvent = {
  type: "job.status";
  project_name: string;
  revision_id?: string;
  stage: ProjectStage;
  status: "processing" | "completed" | "failed";
  updated_at: string;
  cost?: number;
  context_length?: number | null;
  context_window?: number | null;
  context_percent?: number | null;
  summary?: string;
  output_html?: string;
  url?: string;
  error?: string;
};

type Client = {
  readyState: number;
  send(message: string): void;
};

const clients = new Map<string, Set<Client>>();

export function subscribeProjectEvents(projectName: string, client: Client): () => void {
  const projectClients = clients.get(projectName) ?? new Set<Client>();
  projectClients.add(client);
  clients.set(projectName, projectClients);

  return () => {
    projectClients.delete(client);
    if (projectClients.size === 0) clients.delete(projectName);
  };
}

export function publishProjectEvent(event: ProjectJobEvent): void {
  const projectClients = clients.get(event.project_name);
  if (!projectClients) return;

  const message = JSON.stringify(event);
  for (const client of projectClients) {
    if (client.readyState !== 1) continue;
    try {
      client.send(message);
    } catch {
      projectClients.delete(client);
    }
  }
  if (projectClients.size === 0) clients.delete(event.project_name);
}
