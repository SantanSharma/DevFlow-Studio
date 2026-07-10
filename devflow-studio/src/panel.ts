import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import type { McpRegistry } from "./mcp/registry";
import type { AdoService } from "./services/ado-service";
import type { StandupService } from "./services/standup-service";
import type { NotesService } from "./services/notes-service";
import type { WorkedService } from "./services/worked-service";
import type { DashboardService } from "./services/dashboard-service";
import { RpcBridge } from "./rpc/bridge";

export class DashboardPanel {
  public static current: DashboardPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private readonly _disposables: vscode.Disposable[] = [];
  private _bridge!: RpcBridge;

  public static show(
    context: vscode.ExtensionContext,
    registry: McpRegistry,
    ado: AdoService,
    standup: StandupService,
    notes: NotesService,
    worked: WorkedService,
    dashboard: DashboardService,
  ): DashboardPanel {
    if (DashboardPanel.current) {
      DashboardPanel.current._panel.reveal();
      return DashboardPanel.current;
    }
    const panel = vscode.window.createWebviewPanel(
      "devflowStudio",
      "DevFlow Studio",
      vscode.ViewColumn.Active,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(context.extensionUri, "webview", "dist"),
        ],
      },
    );
    DashboardPanel.current = new DashboardPanel(
      panel,
      context,
      registry,
      ado,
      standup,
      notes,
      worked,
      dashboard,
    );
    return DashboardPanel.current;
  }

  private constructor(
    panel: vscode.WebviewPanel,
    private readonly _context: vscode.ExtensionContext,
    registry: McpRegistry,
    ado: AdoService,
    standup: StandupService,
    notes: NotesService,
    worked: WorkedService,
    dashboard: DashboardService,
  ) {
    this._panel = panel;
    this._panel.webview.html = this._buildHtml();
    this._bridge = new RpcBridge(
      (msg) => this._panel.webview.postMessage(msg),
      registry,
      ado,
      standup,
      notes,
      worked,
      dashboard,
      _context,
    );

    this._panel.webview.onDidReceiveMessage(
      (msg) => this._bridge.handle(msg),
      null,
      this._disposables,
    );
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
  }

  public dispose(): void {
    DashboardPanel.current = undefined;
    this._panel.dispose();
    while (this._disposables.length) {
      this._disposables.pop()?.dispose();
    }
  }

  private _buildHtml(): string {
    const distDir = vscode.Uri.joinPath(
      this._context.extensionUri,
      "webview",
      "dist",
    );
    const assetsDir = path.join(distDir.fsPath, "assets");
    let jsFile = "";
    let cssFile = "";
    if (fs.existsSync(assetsDir)) {
      for (const f of fs.readdirSync(assetsDir)) {
        if (f.endsWith(".js")) {
          jsFile = f;
        }
        if (f.endsWith(".css")) {
          cssFile = f;
        }
      }
    }
    const webview = this._panel.webview;
    const jsUri = jsFile
      ? webview.asWebviewUri(vscode.Uri.joinPath(distDir, "assets", jsFile))
      : "";
    const cssUri = cssFile
      ? webview.asWebviewUri(vscode.Uri.joinPath(distDir, "assets", cssFile))
      : "";
    const nonce = randomNonce();
    const csp = `default-src 'none'; img-src ${webview.cspSource} data:; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; font-src ${webview.cspSource};`;
    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta http-equiv="Content-Security-Policy" content="${csp}" />
<title>DevFlow Studio</title>
${cssUri ? `<link rel="stylesheet" href="${cssUri}" />` : ""}
</head>
<body>
<div id="root"></div>
${jsUri ? `<script type="module" nonce="${nonce}" src="${jsUri}"></script>` : `<p style="font-family:sans-serif;padding:24px">Webview bundle not found. Run <code>npm run build:webview</code>.</p>`}
</body>
</html>`;
  }
}

function randomNonce(): string {
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let out = "";
  for (let i = 0; i < 32; i++) {
    out += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return out;
}
