import * as vscode from "vscode";
import type { McpRegistry } from "../mcp/registry";
import type { AdoService } from "../services/ado-service";
import type { StandupService } from "../services/standup-service";
import type { NotesService } from "../services/notes-service";
import type { WorkedService } from "../services/worked-service";
import {
  RpcRequestSchema,
  type RpcRequest,
  type RpcResponse,
  type RpcEvent,
} from "./schema";
import { logger } from "../util/logger";

const ONBOARDING_KEY = "devflowStudio.onboarded";

export class RpcBridge {
  constructor(
    private readonly _post: (msg: RpcResponse | RpcEvent) => void,
    private readonly _registry: McpRegistry,
    private readonly _ado: AdoService,
    private readonly _standup: StandupService,
    private readonly _notes: NotesService,
    private readonly _worked: WorkedService,
    private readonly _context: vscode.ExtensionContext,
  ) {}

  public async handle(raw: unknown): Promise<void> {
    const parsed = RpcRequestSchema.safeParse(raw);
    if (!parsed.success) {
      const id =
        typeof (raw as { id?: unknown })?.id === "string"
          ? (raw as { id: string }).id
          : "unknown";
      this._post({
        id,
        ok: false,
        error: "Invalid RPC request: " + parsed.error.message,
      });
      return;
    }
    const req = parsed.data;
    try {
      const result = await this._dispatch(req);
      this._post({ id: req.id, ok: true, result });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      logger.error(`RPC ${req.method} failed`, e);
      this._post({ id: req.id, ok: false, error: msg });
    }
  }

  public emit(event: RpcEvent): void {
    this._post(event);
  }

  private async _dispatch(req: RpcRequest): Promise<unknown> {
    switch (req.method) {
      case "workItems.list":
        return this._ado.listMyWorkItems({ refresh: req.params?.refresh });
      case "workItems.detail":
        return this._ado.getDetail(req.params.id);
      case "workItems.updateState":
        await this._ado.updateState(req.params.id, req.params.state);
        this.emit({ event: "workItems.changed", data: { count: 1 } });
        return { ok: true };
      case "workItems.addComment":
        await this._ado.addComment(req.params.id, req.params.text);
        return { ok: true };
      case "mcp.listServers":
        return this._registry.list();
      case "mcp.addServer":
        await this._registry.addCustom(req.params);
        return this._registry.list();
      case "mcp.removeServer":
        await this._registry.removeCustom(req.params.id);
        return this._registry.list();
      case "mcp.callTool":
        return this._registry.callTool(
          req.params.serverId,
          req.params.tool,
          req.params.args,
        );
      case "standup.generate": {
        const hours =
          req.params?.windowHours ??
          vscode.workspace
            .getConfiguration()
            .get<number>("devflowStudio.standupWindowHours") ??
          24;
        return this._standup.generate(hours, {
          onStage: (stage) =>
            this.emit({ event: "standup.progress", data: { stage } }),
          onToken: (text) =>
            this.emit({ event: "standup.token", data: { text } }),
        });
      }
      case "settings.get": {
        const cfg = vscode.workspace.getConfiguration("devflowStudio");
        return {
          adoMcpServerId: cfg.get("adoMcpServerId"),
          adoProject: cfg.get("adoProject"),
          project: cfg.get<string>("adoProject") ?? "",
          orgUrl:
            cfg.get<string>("adoOrgUrl") ??
            "https://dev.azure.com/YourOrganization",
          pollIntervalSeconds: cfg.get("pollIntervalSeconds"),
          standupWindowHours: cfg.get("standupWindowHours"),
          meEmail: cfg.get<string>("meEmail") ?? "",
          meDisplayName: cfg.get<string>("meDisplayName") ?? "",
        };
      }
      case "settings.set":
        await vscode.workspace
          .getConfiguration("devflowStudio")
          .update(
            req.params.key,
            req.params.value,
            vscode.ConfigurationTarget.Global,
          );
        return { ok: true };
      case "notes.list":
        return this._notes.list();
      case "notes.appendEntry":
        return this._notes.appendEntry(req.params.id, req.params.text);
      case "notes.deleteEntry":
        return this._notes.deleteEntry(req.params.id, req.params.ts);
      case "notes.toggleDone":
        return this._notes.toggleDone(req.params.id, req.params.done);
      case "notes.remove":
        await this._notes.remove(req.params.id);
        return { ok: true };
      case "worked.list":
        return this._worked.list();
      case "worked.add":
        return this._worked.add(req.params.item);
      case "worked.remove":
        return this._worked.remove(req.params.id);
      case "onboarding.get":
        return {
          done: this._context.globalState.get<boolean>(ONBOARDING_KEY) ?? false,
        };
      case "onboarding.complete":
        await this._context.globalState.update(ONBOARDING_KEY, true);
        return { ok: true };
      case "system.openExternal":
        await vscode.env.openExternal(vscode.Uri.parse(req.params.url));
        return { ok: true };
      case "diag.run":
        return this._ado.diagnose();
    }
  }
}
