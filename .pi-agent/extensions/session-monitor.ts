import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { SessionManager } from "@earendil-works/pi-coding-agent";
import { watch } from "node:fs";
import { readFile } from "node:fs/promises";
import { Key, matchesKey, Text } from "@earendil-works/pi-tui";

type Entry = {
  type?: string;
  timestamp?: string;
  message?: {
    role?: string;
    content?: string | Array<{ type: string; text?: string; name?: string; arguments?: unknown }>;
    command?: string;
    output?: string;
    summary?: string;
    toolName?: string;
    isError?: boolean;
  };
  summary?: string;
  command?: string;
  output?: string;
  toolName?: string;
  isError?: boolean;
};

function text(content: Entry["message"]["content"]): string {
  if (typeof content === "string") return content;
  return (content ?? []).map((part) => {
    if (part.type === "text") return part.text ?? "";
    if (part.type === "toolCall") return `→ ${part.name ?? "tool"}(${JSON.stringify(part.arguments ?? {})})`;
    return "";
  }).filter(Boolean).join("\n");
}

function truncateToolOutput(value: string): string {
  const lines = value.split("\n");
  const clipped = lines.slice(0, 12).join("\n").slice(0, 1200);
  return clipped === value ? value : `${clipped}\n… [tool output truncated]`;
}

function renderEntry(entry: Entry, theme: any): string {
  const time = theme.fg("dim", `[${entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString() : ""}]`);
  if (entry.type === "message") {
    const message = entry.message ?? {};
    const body = text(message.content);
    if (message.role === "user") return `${time} ${theme.fg("accent", theme.bold("YOU"))}\n${body}`;
    if (message.role === "assistant") return `${time} ${theme.fg("success", theme.bold("ASSISTANT"))}\n${body}`;
    if (message.role === "toolResult") {
      const color = message.isError ? "error" : "warning";
      return `${time} ${theme.fg(color, theme.bold(`${message.isError ? "✗" : "✓"} TOOL: ${message.toolName ?? "tool"}`))}\n${theme.fg("muted", truncateToolOutput(body))}`;
    }
    return `${time} ${theme.fg("muted", message.role ?? "message")}\n${body}`;
  }
  if (entry.type === "compaction" || entry.type === "branch_summary") {
    return `${time} ${theme.fg("warning", theme.bold(entry.type.toUpperCase()))}\n${theme.fg("muted", entry.summary ?? "")}`;
  }
  return `${time} ${theme.fg("dim", entry.type ?? "entry")}`;
}

async function load(file: string, theme: any): Promise<string> {
  const source = await readFile(file, "utf8");
  const entries: Entry[] = [];
  for (const line of source.split("\n")) {
    if (!line) continue;
    try { entries.push(JSON.parse(line)); } catch { /* A writer may be mid-append. */ }
  }
  return entries.slice(-40).map((entry) => renderEntry(entry, theme)).join(`\n${theme.fg("dim", "────────────────────────────────────────")}\n`);
}

export default function (pi: ExtensionAPI) {
  pi.registerCommand("monitor", {
    description: "Live-monitor a session from any project (/monitor)",
    handler: async (_args, ctx) => {
      if (ctx.mode !== "tui") {
        ctx.ui.notify("/monitor requires Pi's interactive TUI.", "warning");
        return;
      }

      const all = await SessionManager.listAll();
      if (!all.length) {
        ctx.ui.notify("No saved sessions found.", "info");
        return;
      }

      const projects = [...new Set(all.map((session) => session.cwd || "(unknown project)"))].sort();
      const project = await ctx.ui.select("Monitor project:", projects);
      if (!project) return;

      const sessions = all
        .filter((session) => (session.cwd || "(unknown project)") === project)
        .sort((a, b) => b.modified.getTime() - a.modified.getTime());
      const labels = sessions.map((session) => {
        const title = session.name || session.firstMessage || "(empty session)";
        return `${session.path} — ${title.slice(0, 80)}`;
      });
      const choice = await ctx.ui.select("Monitor session:", labels);
      if (!choice) return;
      const file = sessions[labels.indexOf(choice)]!.path;

      await ctx.ui.custom<void>((tui, theme, _keybindings, done) => {
        const view = new Text("Loading…", 1, 0);
        let closed = false;
        let refreshing = false;

        const refresh = async () => {
          if (refreshing || closed) return;
          refreshing = true;
          try {
            const transcript = await load(file, theme);
            view.setText(
              `${theme.fg("accent", theme.bold("LIVE SESSION MONITOR"))}\n` +
              `${theme.fg("dim", file)}\n` +
              `${theme.fg("dim", "Watching saved entries • r refresh • q/esc close")}\n\n` +
              (transcript || "(session is empty)"),
            );
          } catch (error) {
            view.setText(theme.fg("error", `Cannot read session: ${error instanceof Error ? error.message : String(error)}`));
          } finally {
            refreshing = false;
            tui.requestRender();
          }
        };

        const close = () => {
          if (closed) return;
          closed = true;
          watcher.close();
          clearInterval(poll);
          done();
        };
        const watcher = watch(file, { persistent: false }, () => void refresh());
        // Polling covers filesystems where fs.watch drops append events.
        const poll = setInterval(() => void refresh(), 1000);
        void refresh();

        return {
          render: (width) => view.render(width),
          invalidate: () => view.invalidate(),
          handleInput: (data) => {
            if (matchesKey(data, Key.escape) || matchesKey(data, Key.ctrl("c")) || data === "q") close();
            else if (data === "r") void refresh();
          },
        };
      });
    },
  });
}
