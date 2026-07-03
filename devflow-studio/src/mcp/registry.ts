import * as vscode from "vscode";
import * as fs from "fs/promises";
import * as path from "path";
import { McpClientPool, type McpServerConfig } from "./client";
import type { McpServerInfo, McpServerInput } from "../rpc/schema";
import { logger } from "../util/logger";

const CUSTOM_KEY = "devflowStudio.customMcpServers";

interface RawMcpJson {
  servers?: Record<
    string,
    {
      command?: string;
      args?: string[];
      env?: Record<string, string>;
      type?: string;
    }
  >;
}

export class McpRegistry {
  private readonly _pool = new McpClientPool();

  constructor(private readonly _context: vscode.ExtensionContext) {}

  public async initialize(): Promise<void> {
    const configs = await this._discoverAll();
    logger.info(
      `Discovered ${configs.length} MCP server(s): ${configs.map((c) => c.id).join(", ")}`,
    );
    await Promise.all(
      configs.map(async (cfg) => {
        try {
          await this._pool.connect(cfg);
        } catch {
          // recorded on the pool already
        }
      }),
    );
    const connected = this._pool.list();
    logger.info(`Successfully connected to ${connected.length} MCP server(s)`);
    if (connected.length === 0 && configs.length > 0) {
      throw new Error(
        `Failed to connect to any of ${configs.length} configured MCP server(s). Check the Output panel for details.`,
      );
    }
  }

  public async list(): Promise<McpServerInfo[]> {
    const configs = await this._discoverAll();
    return configs.map((cfg) => {
      const conn = this._pool.list().find((c) => c.config.id === cfg.id);
      return {
        id: cfg.id,
        command: cfg.command,
        args: cfg.args,
        source: cfg.source,
        connected: !!conn,
        toolCount: conn?.tools.length,
        error: this._pool.getError(cfg.id),
      };
    });
  }

  public async callTool(
    serverId: string,
    tool: string,
    args: Record<string, unknown>,
  ): Promise<unknown> {
    if (!this._pool.list().find((c) => c.config.id === serverId)) {
      const cfg = (await this._discoverAll()).find((c) => c.id === serverId);
      if (!cfg) {
        throw new Error(`Unknown MCP server "${serverId}".`);
      }
      await this._pool.connect(cfg);
    }
    return this._pool.callTool(serverId, tool, args);
  }

  public async addCustom(input: McpServerInput): Promise<void> {
    const cfg = vscode.workspace.getConfiguration();
    const existing = (cfg.get<McpServerInput[]>(CUSTOM_KEY) ?? []).filter(
      (s) => s.id !== input.id,
    );
    existing.push(input);
    await cfg.update(CUSTOM_KEY, existing, vscode.ConfigurationTarget.Global);
    await this._pool.disconnect(input.id);
    await this._pool.connect({
      ...input,
      args: input.args ?? [],
      source: "custom",
    });
  }

  public async removeCustom(id: string): Promise<void> {
    const cfg = vscode.workspace.getConfiguration();
    const existing = (cfg.get<McpServerInput[]>(CUSTOM_KEY) ?? []).filter(
      (s) => s.id !== id,
    );
    await cfg.update(CUSTOM_KEY, existing, vscode.ConfigurationTarget.Global);
    await this._pool.disconnect(id);
  }

  public dispose(): Thenable<void> {
    return Promise.resolve(this._pool.disposeAll());
  }

  private async _discoverAll(): Promise<McpServerConfig[]> {
    const byId = new Map<string, McpServerConfig>();
    for (const cfg of await this._readWorkspaceMcpJson()) {
      byId.set(cfg.id, cfg);
    }
    for (const cfg of await this._readUserMcpJson()) {
      if (!byId.has(cfg.id)) {
        byId.set(cfg.id, cfg);
      }
    }
    for (const cfg of this._readCustom()) {
      byId.set(cfg.id, cfg);
    }
    return Array.from(byId.values());
  }

  private async _readWorkspaceMcpJson(): Promise<McpServerConfig[]> {
    const folders = vscode.workspace.workspaceFolders ?? [];
    const result: McpServerConfig[] = [];
    for (const folder of folders) {
      const file = path.join(folder.uri.fsPath, ".vscode", "mcp.json");
      result.push(...(await this._parseMcpFile(file, "workspace")));
    }
    return result;
  }

  private async _readUserMcpJson(): Promise<McpServerConfig[]> {
    const home = process.env.APPDATA ?? process.env.HOME;
    if (!home) {
      return [];
    }
    const candidates =
      process.platform === "win32"
        ? [path.join(home, "Code", "User", "mcp.json")]
        : [
            path.join(home, ".config", "Code", "User", "mcp.json"),
            path.join(
              home,
              "Library",
              "Application Support",
              "Code",
              "User",
              "mcp.json",
            ),
          ];
    const result: McpServerConfig[] = [];
    for (const file of candidates) {
      result.push(...(await this._parseMcpFile(file, "user")));
    }
    return result;
  }

  private async _parseMcpFile(
    file: string,
    source: "workspace" | "user",
  ): Promise<McpServerConfig[]> {
    try {
      const raw = await fs.readFile(file, "utf8");
      const json = JSON.parse(stripJsonComments(raw)) as RawMcpJson;
      const out: McpServerConfig[] = [];
      for (const [id, cfg] of Object.entries(json.servers ?? {})) {
        if (cfg.type && cfg.type !== "stdio") {
          continue;
        }
        if (!cfg.command) {
          continue;
        }
        out.push({
          id,
          command: cfg.command,
          args: cfg.args ?? [],
          env: cfg.env,
          source,
        });
      }
      return out;
    } catch (e: unknown) {
      if ((e as NodeJS.ErrnoException).code !== "ENOENT") {
        logger.warn(`Failed to parse ${file}`, e);
      }
      return [];
    }
  }

  private _readCustom(): McpServerConfig[] {
    const cfg = vscode.workspace.getConfiguration();
    const list = cfg.get<McpServerInput[]>(CUSTOM_KEY) ?? [];
    return list.map((s) => ({
      id: s.id,
      command: s.command,
      args: s.args ?? [],
      env: s.env,
      source: "custom" as const,
    }));
  }
}

function stripJsonComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}
