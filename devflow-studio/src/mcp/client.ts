import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { logger } from "../util/logger";

export interface McpServerConfig {
  id: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
  source: "workspace" | "user" | "custom";
}

export interface McpConnection {
  config: McpServerConfig;
  client: Client;
  tools: string[];
}

export class McpClientPool {
  private readonly _connections = new Map<string, McpConnection>();
  private readonly _connecting = new Map<string, Promise<McpConnection>>();
  private readonly _errors = new Map<string, string>();

  public async connect(config: McpServerConfig): Promise<McpConnection> {
    const existing = this._connections.get(config.id);
    if (existing) {
      return existing;
    }
    const inflight = this._connecting.get(config.id);
    if (inflight) {
      return inflight;
    }
    const p = this._spawn(config).finally(() =>
      this._connecting.delete(config.id),
    );
    this._connecting.set(config.id, p);
    return p;
  }

  public getError(id: string): string | undefined {
    return this._errors.get(id);
  }

  public list(): McpConnection[] {
    return Array.from(this._connections.values());
  }

  public async callTool(
    serverId: string,
    tool: string,
    args: Record<string, unknown>,
  ): Promise<unknown> {
    const conn = this._connections.get(serverId);
    if (!conn) {
      throw new Error(`MCP server "${serverId}" is not connected.`);
    }
    const res = await conn.client.callTool({ name: tool, arguments: args });
    return res;
  }

  public async disconnect(id: string): Promise<void> {
    const conn = this._connections.get(id);
    if (!conn) {
      return;
    }
    this._connections.delete(id);
    try {
      await conn.client.close();
    } catch (e) {
      logger.warn(`Error closing MCP client "${id}"`, e);
    }
  }

  public async disposeAll(): Promise<void> {
    await Promise.all(
      Array.from(this._connections.keys()).map((id) => this.disconnect(id)),
    );
  }

  private async _spawn(config: McpServerConfig): Promise<McpConnection> {
    logger.info(
      `Connecting MCP "${config.id}": ${config.command} ${config.args.join(" ")}`,
    );
    const transport = new StdioClientTransport({
      command: config.command,
      args: config.args,
      env: {
        ...(process.env as Record<string, string>),
        ...(config.env ?? {}),
      },
    });
    const client = new Client(
      { name: "devflow-studio", version: "0.1.0" },
      { capabilities: {} },
    );
    try {
      await client.connect(transport);
      const toolsList = await client.listTools();
      const tools = toolsList.tools.map((t) => t.name);
      const conn: McpConnection = { config, client, tools };
      this._connections.set(config.id, conn);
      this._errors.delete(config.id);
      logger.info(`MCP "${config.id}" connected (${tools.length} tools)`);
      return conn;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this._errors.set(config.id, msg);
      logger.error(`MCP "${config.id}" failed to connect`, e);
      throw e;
    }
  }
}
