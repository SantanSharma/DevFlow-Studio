import * as vscode from "vscode";
import type { McpRegistry } from "../mcp/registry";
import type { WorkItem } from "../rpc/schema";
import { logger } from "../util/logger";

interface ToolCallResult {
  content?: Array<{ type: string; text?: string }>;
  structuredContent?: unknown;
  isError?: boolean;
}

interface BatchWorkItemFields {
  "System.Id": number;
  "System.WorkItemType": string;
  "System.State": string;
  "System.Title": string;
  "System.IterationPath"?: string;
  "System.AreaPath"?: string;
  "System.AssignedTo"?: { displayName?: string } | string;
  "System.Tags"?: string;
  "System.ChangedDate"?: string;
  "System.CreatedDate"?: string;
  "Microsoft.VSTS.Common.Priority"?: number;
  "System.Parent"?: number;
  [key: string]: unknown;
}

interface BatchWorkItemRaw {
  id: number;
  rev?: number;
  fields: BatchWorkItemFields;
  url?: string;
  relations?: Array<{ rel: string; url: string }>;
}

const BATCH_FIELDS = [
  "System.Id",
  "System.WorkItemType",
  "System.State",
  "System.Title",
  "System.IterationPath",
  "System.AreaPath",
  "System.AssignedTo",
  "System.Tags",
  "System.ChangedDate",
  "System.CreatedDate",
  "Microsoft.VSTS.Common.Priority",
  "System.Parent",
];

export class AdoService {
  private _cache: WorkItem[] | null = null;
  private _cacheAt = 0;

  constructor(private readonly _registry: McpRegistry) {}

  private get _serverId(): string {
    return (
      vscode.workspace
        .getConfiguration()
        .get<string>("devflowStudio.adoMcpServerId") ?? "ado"
    );
  }

  private get _project(): string {
    return (
      vscode.workspace
        .getConfiguration()
        .get<string>("devflowStudio.adoProject") ?? ""
    );
  }

  private get _extraAssigneeFields(): string[] {
    return (
      vscode.workspace
        .getConfiguration()
        .get<string[]>("devflowStudio.extraAssigneeFields") ?? []
    ).filter((s) => typeof s === "string" && s.trim().length > 0);
  }

  private get _storyPointsFields(): string[] {
    return (
      vscode.workspace
        .getConfiguration()
        .get<string[]>("devflowStudio.storyPointsFields") ?? []
    ).filter((s) => typeof s === "string" && s.trim().length > 0);
  }

  private get _meEmail(): string {
    return (
      vscode.workspace
        .getConfiguration()
        .get<string>("devflowStudio.meEmail") ?? ""
    ).trim();
  }

  private get _meDisplayName(): string {
    return (
      vscode.workspace
        .getConfiguration()
        .get<string>("devflowStudio.meDisplayName") ?? ""
    ).trim();
  }

  private get _savedQueryId(): string {
    return (
      vscode.workspace
        .getConfiguration()
        .get<string>("devflowStudio.savedQueryId") ?? ""
    ).trim();
  }

  private _resolvedQueryId: { input: string; id: string } | null = null;

  private async _resolveSavedQueryId(input: string): Promise<string> {
    // GUIDs and ids without a '/' are used as-is.
    if (!input.includes("/")) {
      return input;
    }
    if (this._resolvedQueryId && this._resolvedQueryId.input === input) {
      return this._resolvedQueryId.id;
    }
    const raw = (await this._callJson("wit_get_query", {
      project: this._project,
      query: input,
    })) as { id?: string; value?: { id?: string } };
    const id = raw?.id ?? raw?.value?.id;
    if (!id) {
      throw new Error(`Could not resolve saved query path '${input}' to an id`);
    }
    this._resolvedQueryId = { input, id };
    return id;
  }

  private _extractQueryIds(raw: unknown): number[] {
    if (!raw || typeof raw !== "object") {
      return [];
    }
    const obj = raw as Record<string, unknown>;
    const ids = new Set<number>();
    const addId = (v: unknown): void => {
      if (typeof v === "number" && Number.isFinite(v)) {
        ids.add(v);
      } else if (typeof v === "string" && /^\d+$/.test(v)) {
        ids.add(Number(v));
      }
    };
    if (Array.isArray(obj.workItems)) {
      for (const w of obj.workItems as unknown[]) {
        if (w && typeof w === "object") {
          addId((w as { id?: unknown }).id);
        }
      }
    }
    if (Array.isArray(obj.workItemRelations)) {
      for (const r of obj.workItemRelations as unknown[]) {
        if (r && typeof r === "object") {
          const rel = r as {
            source?: { id?: unknown };
            target?: { id?: unknown };
          };
          if (rel.source) {
            addId(rel.source.id);
          }
          if (rel.target) {
            addId(rel.target.id);
          }
        }
      }
    }
    if (ids.size === 0) {
      for (const r of this._extractIdRows(raw)) {
        addId(r.id);
      }
    }
    return Array.from(ids);
  }

  private _quoteWiqlString(s: string): string {
    return `'${s.replace(/'/g, "''")}'`;
  }

  private _identityLiterals(): string[] {
    const email = this._meEmail;
    const name = this._meDisplayName;
    const out: string[] = [];
    if (name && email) {
      out.push(`${name} <${email}>`);
    }
    if (email) {
      out.push(email);
    }
    if (name) {
      out.push(name);
    }
    return out.map((s) => this._quoteWiqlString(s));
  }

  // Defensive: MCP responses come back in many shapes — an array, an object
  // with `workItems` / `results` / `value`, or (observed in practice) an
  // object whose keys are stringified array indices ("0","1","2",…).
  private _extractIdRows(raw: unknown): Array<{ id: number }> {
    if (!raw) {
      return [];
    }
    let candidate: unknown = raw;
    if (typeof candidate === "object" && !Array.isArray(candidate)) {
      const obj = candidate as Record<string, unknown>;
      const named = obj.workItems ?? obj.results ?? obj.value;
      if (Array.isArray(named)) {
        candidate = named;
      } else {
        // Numeric-keyed object → treat as array
        const keys = Object.keys(obj);
        if (keys.length > 0 && keys.every((k) => /^\d+$/.test(k))) {
          candidate = keys
            .sort((a, b) => Number(a) - Number(b))
            .map((k) => obj[k]);
        }
      }
    }
    if (!Array.isArray(candidate)) {
      return [];
    }
    const out: Array<{ id: number }> = [];
    for (const r of candidate as unknown[]) {
      if (r && typeof r === "object") {
        const id = (r as { id?: unknown }).id;
        if (typeof id === "number" && Number.isFinite(id)) {
          out.push({ id });
        } else if (typeof id === "string" && /^\d+$/.test(id)) {
          out.push({ id: Number(id) });
        }
      }
    }
    return out;
  }

  private async _resolveMe(): Promise<string | undefined> {
    const explicit = this._meEmail;
    if (explicit) {
      return explicit;
    }
    try {
      const raw = (await this._callJson("core_get_identity_ids", {})) as {
        identities?: Array<{
          uniqueName?: string;
          mailAddress?: string;
          displayName?: string;
        }>;
        value?: Array<{
          uniqueName?: string;
          mailAddress?: string;
          displayName?: string;
        }>;
      };
      const arr = raw?.identities ?? raw?.value ?? [];
      const first = arr[0];
      const email = first?.uniqueName ?? first?.mailAddress;
      if (email) {
        return email;
      }
    } catch {
      /* ignore */
    }
    return undefined;
  }

  public async listMyWorkItems(
    opts: { refresh?: boolean } = {},
  ): Promise<WorkItem[]> {
    const ttlMs = 5 * 60 * 1000;
    if (!opts.refresh && this._cache && Date.now() - this._cacheAt < ttlMs) {
      return this._cache;
    }
    const ids = await this._collectAllAssignedIds();
    if (ids.length === 0) {
      this._cache = [];
      this._cacheAt = Date.now();
      return [];
    }
    const items: WorkItem[] = [];
    const fields = [...BATCH_FIELDS, ...this._storyPointsFields];
    for (let i = 0; i < ids.length; i += 200) {
      const chunk = ids.slice(i, i + 200);
      const raw = await this._callJson("wit_get_work_items_batch_by_ids", {
        ids: chunk,
        project: this._project,
        fields,
      });
      items.push(...this._parseBatch(raw));
    }
    items.sort((a, b) =>
      (b.changedDate ?? "").localeCompare(a.changedDate ?? ""),
    );
    this._cache = items;
    this._cacheAt = Date.now();
    return items;
  }

  public async getDetail(id: number): Promise<unknown> {
    return this._callJson("wit_get_work_item", {
      id,
      project: this._project,
      expand: "all",
    });
  }

  public async updateState(id: number, state: string): Promise<void> {
    await this._callJson("wit_update_work_item", {
      id,
      updates: [{ op: "Replace", path: "/fields/System.State", value: state }],
    });
    this._cache = null;
  }

  public async addComment(id: number, text: string): Promise<void> {
    await this._callJson("wit_add_work_item_comment", {
      id,
      project: this._project,
      comment: text,
      format: "Markdown",
    });
  }

  public async getRecentComments(
    workItemIds: number[],
    sinceIso: string,
    me: string,
  ): Promise<Array<{ workItemId: number; text: string; createdDate: string }>> {
    const out: Array<{
      workItemId: number;
      text: string;
      createdDate: string;
    }> = [];
    const since = new Date(sinceIso).getTime();
    for (const id of workItemIds) {
      try {
        const raw = (await this._callJson("wit_list_work_item_comments", {
          id,
          project: this._project,
        })) as {
          comments?: Array<{
            text?: string;
            createdDate?: string;
            createdBy?: { displayName?: string; uniqueName?: string };
          }>;
        };
        for (const c of raw.comments ?? []) {
          const t = c.createdDate ? new Date(c.createdDate).getTime() : 0;
          if (t < since) {
            continue;
          }
          const author =
            c.createdBy?.uniqueName ?? c.createdBy?.displayName ?? "";
          if (me && !author.toLowerCase().includes(me.toLowerCase())) {
            continue;
          }
          out.push({
            workItemId: id,
            text: stripHtml(c.text ?? ""),
            createdDate: c.createdDate ?? "",
          });
        }
      } catch (e) {
        logger.warn(`Failed to fetch comments for ${id}`, e);
      }
    }
    return out;
  }

  public async getMyCommits(
    sinceIso: string,
    me: string,
  ): Promise<
    Array<{ repo: string; id: string; comment: string; date: string }>
  > {
    if (!me) {
      return [];
    }
    try {
      const raw = (await this._callJson("repo_search_commits", {
        project: this._project,
        searchText: "",
        fromDate: sinceIso,
        author: me,
        top: 50,
      })) as {
        results?: Array<{
          repository?: { name?: string };
          commitId?: string;
          comment?: string;
          author?: { date?: string; name?: string; email?: string };
        }>;
      };
      return (raw.results ?? []).map((c) => ({
        repo: c.repository?.name ?? "",
        id: (c.commitId ?? "").slice(0, 8),
        comment: (c.comment ?? "").split("\n")[0],
        date: c.author?.date ?? "",
      }));
    } catch (e) {
      logger.warn("getMyCommits failed (tool may not be available)", e);
      return [];
    }
  }

  public async getMyPullRequests(
    sinceIso: string,
    me: string,
  ): Promise<
    Array<{
      id: number;
      title: string;
      status: string;
      repo: string;
      createdDate: string;
      role: "author" | "reviewer";
    }>
  > {
    const since = new Date(sinceIso).getTime();
    const out: Array<{
      id: number;
      title: string;
      status: string;
      repo: string;
      createdDate: string;
      role: "author" | "reviewer";
    }> = [];
    try {
      const raw = (await this._callJson("repo_list_pull_requests_by_project", {
        project: this._project,
        status: "all",
        top: 100,
      })) as {
        value?: Array<{
          pullRequestId?: number;
          title?: string;
          status?: string;
          creationDate?: string;
          createdBy?: { uniqueName?: string; displayName?: string };
          reviewers?: Array<{
            uniqueName?: string;
            displayName?: string;
            vote?: number;
          }>;
          repository?: { name?: string };
        }>;
      };
      for (const pr of raw.value ?? []) {
        const t = pr.creationDate ? new Date(pr.creationDate).getTime() : 0;
        if (t < since) {
          continue;
        }
        const author =
          pr.createdBy?.uniqueName ?? pr.createdBy?.displayName ?? "";
        const isAuthor =
          !!me && author.toLowerCase().includes(me.toLowerCase());
        const isReviewer = (pr.reviewers ?? []).some(
          (r) =>
            !!me &&
            (r.uniqueName ?? r.displayName ?? "")
              .toLowerCase()
              .includes(me.toLowerCase()),
        );
        if (!isAuthor && !isReviewer) {
          continue;
        }
        out.push({
          id: pr.pullRequestId ?? 0,
          title: pr.title ?? "",
          status: pr.status ?? "",
          repo: pr.repository?.name ?? "",
          createdDate: pr.creationDate ?? "",
          role: isAuthor ? "author" : "reviewer",
        });
      }
    } catch (e) {
      logger.warn("getMyPullRequests failed (tool may not be available)", e);
    }
    return out;
  }

  public async getStateChanges(
    workItemIds: number[],
    sinceIso: string,
    me: string,
  ): Promise<
    Array<{ workItemId: number; from: string; to: string; changedDate: string }>
  > {
    const out: Array<{
      workItemId: number;
      from: string;
      to: string;
      changedDate: string;
    }> = [];
    const since = new Date(sinceIso).getTime();
    for (const id of workItemIds) {
      try {
        const raw = (await this._callJson("wit_get_work_item_updates", {
          id,
          project: this._project,
        })) as {
          value?: Array<{
            revisedBy?: { uniqueName?: string };
            revisedDate?: string;
            fields?: Record<string, { oldValue?: unknown; newValue?: unknown }>;
          }>;
        };
        for (const upd of raw.value ?? []) {
          const t = upd.revisedDate ? new Date(upd.revisedDate).getTime() : 0;
          if (t < since) {
            continue;
          }
          const author = upd.revisedBy?.uniqueName ?? "";
          if (me && !author.toLowerCase().includes(me.toLowerCase())) {
            continue;
          }
          const stateField = upd.fields?.["System.State"];
          if (stateField && stateField.oldValue !== stateField.newValue) {
            out.push({
              workItemId: id,
              from: String(stateField.oldValue ?? ""),
              to: String(stateField.newValue ?? ""),
              changedDate: upd.revisedDate ?? "",
            });
          }
        }
      } catch (e) {
        logger.warn(`Failed to fetch updates for ${id}`, e);
      }
    }
    return out;
  }

  private async _collectAllAssignedIds(): Promise<number[]> {
    // If the user has pinned a saved query (e.g. "My Queries/SS-WorkItems"),
    // treat it as the single source of truth — execute it fresh and return
    // its ids. All other dashboard filters apply client-side over this set.
    const savedInput = this._savedQueryId;
    if (savedInput) {
      try {
        const queryId = await this._resolveSavedQueryId(savedInput);
        const raw = await this._callJson("wit_get_query_results_by_id", {
          id: queryId,
          project: this._project,
          top: 1000,
        });
        const ids = this._extractQueryIds(raw);
        logger.info(
          `Saved query '${savedInput}' (id=${queryId}) returned ${ids.length} ids`,
        );
        if (ids.length > 0) {
          return ids;
        }
        logger.warn(
          `Saved query '${savedInput}' returned 0 ids; falling back to WIQL`,
        );
      } catch (e) {
        logger.warn(
          `Saved query '${savedInput}' failed; falling back to WIQL`,
          e,
        );
      }
    }

    const extras = this._extraAssigneeFields;
    const fields = ["System.AssignedTo", ...extras];
    const literals = this._identityLiterals();
    const candidates: string[] =
      literals.length > 0 ? literals.concat(["@Me"]) : ["@Me"];
    const idSet = new Set<number>();
    let anySuccess = false;
    for (const fname of fields) {
      let fieldTotal = 0;
      for (const cand of candidates) {
        const eqClause = `[${fname}] = ${cand}`;
        const everClause = `[${fname}] EVER ${cand}`;
        const wiql =
          "SELECT [System.Id] FROM WorkItems " +
          `WHERE (${eqClause} OR ${everClause}) ` +
          "ORDER BY [System.ChangedDate] DESC";
        try {
          const raw = await this._callJson("wit_query_by_wiql", {
            project: this._project,
            wiql,
            top: 1000,
          });
          const rows = this._extractIdRows(raw);
          let added = 0;
          for (const r of rows) {
            if (Number.isFinite(r?.id)) {
              idSet.add(r.id);
              added++;
            }
          }
          fieldTotal += added;
          anySuccess = true;
          logger.info(`WIQL on [${fname}] (me=${cand}) returned ${added} ids`);
        } catch (e) {
          logger.warn(`WIQL on [${fname}] (me=${cand}) failed`, e);
        }
      }
      logger.info(`WIQL total for [${fname}] = ${fieldTotal}`);
    }
    // Also pull current direct assignments via the dedicated tool — it covers
    // anything missed by WIQL identity matching.
    try {
      const raw = await this._callJson("wit_my_work_items", {
        type: "assignedtome",
        top: 500,
        project: this._project,
        includeCompleted: true,
      });
      for (const r of this._extractIdRows(raw)) {
        if (Number.isFinite(r.id)) {
          idSet.add(r.id);
        }
      }
      anySuccess = true;
      logger.info(`wit_my_work_items added; total now ${idSet.size}`);
    } catch (e) {
      logger.warn("wit_my_work_items failed", e);
    }
    if (anySuccess) {
      return Array.from(idSet);
    }
    return [];
  }

  private _parseBatch(raw: unknown): WorkItem[] {
    const arr = Array.isArray(raw)
      ? raw
      : ((raw as { value?: BatchWorkItemRaw[] }).value ?? []);
    const spFields = this._storyPointsFields;
    return (arr as BatchWorkItemRaw[]).map((w) => {
      const f = w.fields;
      const assignee = f["System.AssignedTo"];
      let storyPoints: number | undefined;
      for (const fname of spFields) {
        const v = f[fname];
        if (typeof v === "number" && Number.isFinite(v)) {
          storyPoints = v;
          break;
        }
        if (typeof v === "string" && v.trim() !== "") {
          const n = Number(v);
          if (Number.isFinite(n)) {
            storyPoints = n;
            break;
          }
        }
      }
      return {
        id: w.id,
        rev: w.rev,
        type: f["System.WorkItemType"],
        state: f["System.State"],
        title: f["System.Title"],
        iterationPath: f["System.IterationPath"],
        areaPath: f["System.AreaPath"],
        assignedTo:
          typeof assignee === "string" ? assignee : assignee?.displayName,
        priority: f["Microsoft.VSTS.Common.Priority"],
        storyPoints,
        tags: f["System.Tags"]
          ? f["System.Tags"]
              .split(";")
              .map((t) => t.trim())
              .filter(Boolean)
          : [],
        changedDate: f["System.ChangedDate"],
        createdDate: f["System.CreatedDate"],
        parentId: f["System.Parent"],
        url: w.url,
      };
    });
  }

  private async _callJson(
    tool: string,
    args: Record<string, unknown>,
  ): Promise<unknown> {
    const res = (await this._registry.callTool(
      this._serverId,
      tool,
      args,
    )) as ToolCallResult;
    if (res.isError) {
      const msg =
        res.content?.find((c) => c.type === "text")?.text ??
        `Tool ${tool} returned an error`;
      throw new Error(msg);
    }
    const textBlock = res.content?.find((c) => c.type === "text")?.text;
    let fromText: unknown = undefined;
    if (textBlock) {
      try {
        fromText = JSON.parse(textBlock);
      } catch {
        fromText = textBlock;
      }
    }
    const structured = res.structuredContent;
    // Prefer the candidate whose shape looks "real" (array or has expected keys)
    const candidates = [fromText, structured].filter((v) => v !== undefined);
    for (const c of candidates) {
      if (Array.isArray(c)) {
        return c;
      }
      if (
        c &&
        typeof c === "object" &&
        ("workItems" in c ||
          "value" in c ||
          "results" in c ||
          "comments" in c ||
          "fields" in c)
      ) {
        return c;
      }
    }
    return candidates[0] ?? null;
  }

  public async diagnose(): Promise<{
    project: string;
    serverId: string;
    resolvedMe?: string;
    meEmailSetting: string;
    meDisplayNameSetting: string;
    identityLiteralsTried: string[];
    extraFields: string[];
    storyPointsFields: string[];
    perField: Array<{
      field: string;
      literal: string;
      count: number;
      rawShape?: string;
      error?: string;
    }>;
    myWorkItemsCount?: number;
    myWorkItemsError?: string;
    totalIds: number;
    sampleIds: number[];
    batchSample?: unknown;
  }> {
    const extras = this._extraAssigneeFields;
    const me = await this._resolveMe();
    const literals = this._identityLiterals();
    const candidates: string[] =
      literals.length > 0 ? literals.concat(["@Me"]) : ["@Me"];
    const perField: Array<{
      field: string;
      literal: string;
      count: number;
      rawShape?: string;
      error?: string;
    }> = [];
    const idSet = new Set<number>();
    for (const fname of ["System.AssignedTo", ...extras]) {
      for (const cand of candidates) {
        const eqClause = `[${fname}] = ${cand}`;
        const everClause = `[${fname}] EVER ${cand}`;
        const wiql =
          "SELECT [System.Id] FROM WorkItems " +
          `WHERE (${eqClause} OR ${everClause}) ` +
          "ORDER BY [System.ChangedDate] DESC";
        try {
          const raw = await this._callJson("wit_query_by_wiql", {
            project: this._project,
            wiql,
            top: 1000,
          });
          const rows = this._extractIdRows(raw);
          let count = 0;
          for (const r of rows) {
            if (Number.isFinite(r?.id)) {
              idSet.add(r.id);
              count++;
            }
          }
          perField.push({
            field: fname,
            literal: cand,
            count,
            rawShape:
              raw === null || raw === undefined
                ? "null"
                : Array.isArray(raw)
                  ? `array(${(raw as unknown[]).length})`
                  : `object(${Object.keys(raw as object).join(",")})`,
          });
        } catch (e) {
          perField.push({
            field: fname,
            literal: cand,
            count: 0,
            error: e instanceof Error ? e.message : String(e),
          });
        }
      }
    }
    let myWorkItemsCount: number | undefined;
    let myWorkItemsError: string | undefined;
    try {
      const raw = await this._callJson("wit_my_work_items", {
        type: "assignedtome",
        top: 500,
        project: this._project,
        includeCompleted: true,
      });
      const list = this._extractIdRows(raw);
      myWorkItemsCount = list.length;
      for (const r of list) {
        if (Number.isFinite(r.id)) {
          idSet.add(r.id);
        }
      }
    } catch (e) {
      myWorkItemsError = e instanceof Error ? e.message : String(e);
    }
    const ids = Array.from(idSet);
    let batchSample: unknown;
    if (ids.length > 0) {
      try {
        batchSample = await this._callJson("wit_get_work_items_batch_by_ids", {
          ids: ids.slice(0, 1),
          project: this._project,
          fields: [...BATCH_FIELDS, ...this._storyPointsFields],
        });
      } catch (e) {
        batchSample = { error: e instanceof Error ? e.message : String(e) };
      }
    }
    return {
      project: this._project,
      serverId: this._serverId,
      resolvedMe: me,
      meEmailSetting: this._meEmail,
      meDisplayNameSetting: this._meDisplayName,
      identityLiteralsTried: candidates,
      extraFields: extras,
      storyPointsFields: this._storyPointsFields,
      perField,
      myWorkItemsCount,
      myWorkItemsError,
      totalIds: ids.length,
      sampleIds: ids.slice(0, 10),
      batchSample,
    };
  }
}

function stripHtml(s: string): string {
  return s
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
