import * as vscode from "vscode";
import type { AdoService } from "./ado-service";
import type { LmClient } from "./lm-client";
import type { NotesService, NoteEntry } from "./notes-service";
import type { StandupResult, WorkItem } from "../rpc/schema";

const ACTIVE_STATES = new Set([
  "New",
  "Active",
  "Ready for Dev",
  "In Development",
  "In Progress",
  "To Do",
]);
const BLOCKED_STATES = new Set(["Redbin/Blocked", "Blocked", "On Hold"]);
const STANDUP_HISTORY_KEY = "devflowStudio.standupHistory";
const MAX_HISTORY_ITEMS = 10;

export interface StandupProgress {
  onStage: (stage: string) => void;
  onToken: (text: string) => void;
}

export interface StandupHistoryEntry {
  date: string;
  timeWindow: string;
  preview: string;
  workItemCount: number;
  blockerCount: number;
  fullText: string;
}

export class StandupService {
  constructor(
    private readonly _ado: AdoService,
    private readonly _lm: LmClient,
    private readonly _notes: NotesService,
    private readonly _context: vscode.ExtensionContext,
  ) {}

  public async generate(
    windowHours: number,
    progress: StandupProgress,
    token?: vscode.CancellationToken,
  ): Promise<StandupResult> {
    progress.onStage("Loading assigned work items");
    const items = await this._ado.listMyWorkItems({ refresh: true });
    const sinceIso = new Date(
      Date.now() - windowHours * 3600_000,
    ).toISOString();
    const me = await this._guessMe();

    progress.onStage("Collecting recent comments");
    const recentIds = items
      .filter(
        (i) =>
          (i.changedDate ?? "") > sinceIso ||
          ACTIVE_STATES.has(i.state) ||
          BLOCKED_STATES.has(i.state),
      )
      .slice(0, 120)
      .map((i) => i.id);
    const comments = await this._ado.getRecentComments(recentIds, sinceIso, me);

    progress.onStage("Collecting state changes");
    const stateChanges = await this._ado.getStateChanges(
      recentIds,
      sinceIso,
      me,
    );

    progress.onStage("Collecting commits and pull requests");
    const [commits, prs] = await Promise.all([
      this._ado.getMyCommits(sinceIso, me),
      this._ado.getMyPullRequests(sinceIso, me),
    ]);

    const blocked = items.filter(
      (i) =>
        BLOCKED_STATES.has(i.state) ||
        i.tags.some((t) => t.toLowerCase().includes("block")),
    );
    const planned = this._pickPlanned(items);

    progress.onStage("Reading my private journal entries");
    const journal = this._notes.getEntriesSince(sinceIso);

    const context = {
      windowHours,
      commentCount: comments.length,
      stateChangeCount: stateChanges.length,
      blockedCount: blocked.length,
      plannedCount: planned.length,
      commitCount: commits.length,
      prCount: prs.length,
      journalCount: journal.length,
    };

    progress.onStage("Asking Claude to draft the standup");
    const prompt = this._buildPrompt({
      windowHours,
      comments,
      stateChanges,
      blocked,
      planned,
      commits,
      prs,
      journal,
      items,
    });
    const markdown = await this._lm.generate(
      prompt,
      { onToken: progress.onToken },
      token,
    );

    // Auto-save to history
    await this._saveStandup({
      markdown,
      windowHours,
      workItemCount: recentIds.length,
      blockerCount: blocked.length,
    });

    return { markdown, context };
  }

  private _pickPlanned(items: WorkItem[]): WorkItem[] {
    const currentSprint = this._guessCurrentIteration(items);
    return items
      .filter((i) => ACTIVE_STATES.has(i.state))
      .filter(
        (i) =>
          !currentSprint || (i.iterationPath ?? "").includes(currentSprint),
      )
      .sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99))
      .slice(0, 10);
  }

  private _guessCurrentIteration(items: WorkItem[]): string | undefined {
    const counts = new Map<string, number>();
    const active = items.filter((i) => ACTIVE_STATES.has(i.state));
    for (const i of active) {
      const path = i.iterationPath;
      if (!path) {
        continue;
      }
      counts.set(path, (counts.get(path) ?? 0) + 1);
    }
    let best: string | undefined;
    let max = 0;
    for (const [k, v] of counts) {
      if (v > max) {
        best = k;
        max = v;
      }
    }
    return best;
  }

  public getHistory(): StandupHistoryEntry[] {
    const history = this._context.globalState.get<StandupHistoryEntry[]>(
      STANDUP_HISTORY_KEY,
      [],
    );
    return history;
  }

  public getCurrentStandup(): StandupHistoryEntry | null {
    const history = this.getHistory();
    return history.length > 0 ? history[0] : null;
  }

  public async deleteStandup(index: number): Promise<void> {
    const history = this.getHistory();
    if (index >= 0 && index < history.length) {
      history.splice(index, 1);
      await this._context.globalState.update(STANDUP_HISTORY_KEY, history);
    }
  }

  private async _saveStandup(data: {
    markdown: string;
    windowHours: number;
    workItemCount: number;
    blockerCount: number;
  }): Promise<void> {
    const now = new Date();
    const dateStr = now.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const timeWindow =
      data.windowHours === 24
        ? "Last 24 hours"
        : data.windowHours === 48
          ? "Last 48 hours"
          : `Last ${data.windowHours} hours`;

    // Extract first 2-3 lines as preview (skip header)
    const lines = data.markdown.split("\n").filter((l) => l.trim());
    const contentLines = lines.filter(
      (l) => !l.startsWith("#") && !l.startsWith("---"),
    );
    const preview = contentLines.slice(0, 2).join(" ").substring(0, 150);

    const entry: StandupHistoryEntry = {
      date: `${dateStr} - ${timeWindow}`,
      timeWindow,
      preview: preview || "(empty standup)",
      workItemCount: data.workItemCount,
      blockerCount: data.blockerCount,
      fullText: data.markdown,
    };

    // Get existing history
    const history = this.getHistory();

    // Add new entry at the beginning
    history.unshift(entry);

    // Keep only last MAX_HISTORY_ITEMS
    const trimmed = history.slice(0, MAX_HISTORY_ITEMS);

    // Save back to global state
    await this._context.globalState.update(STANDUP_HISTORY_KEY, trimmed);
  }

  private async _guessMe(): Promise<string> {
    try {
      const session = await vscode.authentication.getSession(
        "microsoft",
        ["offline_access"],
        { createIfNone: false },
      );
      if (session?.account?.label) {
        return session.account.label;
      }
    } catch {
      // ignore — fall through to env fallback
    }
    return process.env.USER ?? process.env.USERNAME ?? "";
  }

  private _buildPrompt(input: {
    windowHours: number;
    comments: Array<{ workItemId: number; text: string; createdDate: string }>;
    stateChanges: Array<{
      workItemId: number;
      from: string;
      to: string;
      changedDate: string;
    }>;
    blocked: WorkItem[];
    planned: WorkItem[];
    commits: Array<{ repo: string; id: string; comment: string; date: string }>;
    prs: Array<{
      id: number;
      title: string;
      status: string;
      repo: string;
      createdDate: string;
      role: "author" | "reviewer";
    }>;
    journal: Array<NoteEntry & { id: number }>;
    items: WorkItem[];
  }): string {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10);
    const titleById = new Map<number, string>();
    for (const w of input.items) {
      titleById.set(w.id, w.title);
    }
    const titleFor = (id: number): string => {
      const t = titleById.get(id);
      return t ? ` — ${truncate(t, 80)}` : "";
    };

    const lines: string[] = [];
    lines.push(`# /standup`);
    lines.push(``);
    lines.push(
      `You are generating my daily standup update. Follow the exact output template at the bottom of this prompt. Be concise, specific, and action-oriented. Reference work items as #<id>. Do NOT invent items, commits, or PRs that are not in the data below. If a section has no data, write "(none)" — do not pad with filler.`,
    );
    lines.push(``);
    lines.push(`## Rules`);
    lines.push(
      `- **Yesterday section is driven primarily by my private journal entries below** (the "My private journal entries" block). These are the personal notes I jot down as I work — they are the most accurate record of what I actually did. Summarize each entry (or related cluster on the same work item) into one bullet. Reference the work item id as #<id>.`,
    );
    lines.push(
      `- If a work item appears in the journal, prefer the journal text over ADO comments for that item.`,
    );
    lines.push(
      `- Use "Comments I authored" only to supplement Yesterday when the journal is silent on that item.`,
    );
    lines.push(
      `- Augment Yesterday with state changes I made (e.g. moved #123 from Active → Resolved), commits I authored, and PRs I opened/reviewed/merged. Keep these as separate bullets only if they add information beyond the comments.`,
    );
    lines.push(
      `- **Today section** lists my planned active items in the current sprint (see "Today's planned items" below). Prioritise blocked items I'm trying to unblock, then in-progress items by priority. Cap at ~5 bullets.`,
    );
    lines.push(
      `- **Blockers section** lists items in blocked states or anything my comments mention being stuck on. Include who could help if obvious from the comment text. If nothing is blocked, write "- None".`,
    );
    lines.push(
      `- Keep bullets to one line each. Use plain Markdown only. Do NOT include the raw data sections in your output.`,
    );
    lines.push(``);
    lines.push(`---`);
    lines.push(``);
    lines.push(`# DATA (last ${input.windowHours}h)`);
    lines.push(``);
    lines.push(
      `## My private journal entries (PRIMARY SOURCE for "Yesterday" — these are my own daily notes, never sent to ADO)`,
    );
    if (input.journal.length === 0) {
      lines.push("(none)");
    } else {
      const byItem = new Map<number, typeof input.journal>();
      for (const j of input.journal) {
        const arr = byItem.get(j.id) ?? [];
        arr.push(j);
        byItem.set(j.id, arr);
      }
      for (const [id, arr] of byItem) {
        lines.push(`### #${id}${titleFor(id)}`);
        for (const j of arr) {
          lines.push(`- ${j.ts}: ${truncate(j.text, 500)}`);
        }
      }
    }
    lines.push(``);
    lines.push(
      `## Comments I authored (supplementary — only use when the journal is silent on a given item)`,
    );
    if (input.comments.length === 0) {
      lines.push("(none)");
    } else {
      const byItem = new Map<number, typeof input.comments>();
      for (const c of input.comments) {
        const arr = byItem.get(c.workItemId) ?? [];
        arr.push(c);
        byItem.set(c.workItemId, arr);
      }
      for (const [id, arr] of byItem) {
        lines.push(`### #${id}${titleFor(id)}`);
        for (const c of arr.sort((a, b) =>
          a.createdDate.localeCompare(b.createdDate),
        )) {
          lines.push(`- ${c.createdDate}: ${truncate(c.text, 500)}`);
        }
      }
    }
    lines.push(``);
    lines.push(`## State changes I made`);
    if (input.stateChanges.length === 0) {
      lines.push("(none)");
    } else {
      for (const s of input.stateChanges) {
        lines.push(
          `- #${s.workItemId}${titleFor(s.workItemId)}: ${s.from} → ${s.to} @ ${s.changedDate}`,
        );
      }
    }
    lines.push(``);
    lines.push(`## Commits I authored`);
    if (input.commits.length === 0) {
      lines.push("(none)");
    } else {
      for (const c of input.commits) {
        lines.push(`- ${c.repo}@${c.id}: ${truncate(c.comment, 160)}`);
      }
    }
    lines.push(``);
    lines.push(`## Pull requests`);
    if (input.prs.length === 0) {
      lines.push("(none)");
    } else {
      for (const p of input.prs) {
        lines.push(
          `- PR !${p.id} [${p.status}, as ${p.role}] ${p.title} (${p.repo})`,
        );
      }
    }
    lines.push(``);
    lines.push(`## Items I am blocked on`);
    if (input.blocked.length === 0) {
      lines.push("(none)");
    } else {
      for (const b of input.blocked) {
        lines.push(`- #${b.id} [${b.state}] ${b.title}`);
      }
    }
    lines.push(``);
    lines.push(`## Today's planned items (current sprint, active)`);
    if (input.planned.length === 0) {
      lines.push("(none)");
    } else {
      for (const p of input.planned) {
        lines.push(`- #${p.id} [${p.type}/${p.state}] ${p.title}`);
      }
    }
    lines.push(``);
    lines.push(`---`);
    lines.push(``);
    lines.push(`# OUTPUT TEMPLATE (return only this, filled in)`);
    lines.push(``);
    lines.push("```markdown");
    lines.push(`## Standup — ${dateStr}`);
    lines.push(``);
    lines.push(`### Yesterday`);
    lines.push(`- [item with #id reference]`);
    lines.push(``);
    lines.push(`### Today`);
    lines.push(`- [item with #id reference]`);
    lines.push(``);
    lines.push(`### Blockers`);
    lines.push(`- [blocker with context, or "None"]`);
    lines.push("```");
    return lines.join("\n");
  }
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}
