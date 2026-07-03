import * as vscode from "vscode";
import { McpRegistry } from "./mcp/registry";
import { AdoService } from "./services/ado-service";
import { LmClient } from "./services/lm-client";
import { StandupService } from "./services/standup-service";
import { NotesService } from "./services/notes-service";
import { WorkedService } from "./services/worked-service";
import { DashboardPanel } from "./panel";
import { logger } from "./util/logger";

let _registry: McpRegistry;
let _ado: AdoService;
let _standup: StandupService;
let _notes: NotesService;
let _worked: WorkedService;
let _statusBar: vscode.StatusBarItem;
let _pollTimer: NodeJS.Timeout | undefined;

export async function activate(
  context: vscode.ExtensionContext,
): Promise<void> {
  logger.info("DevFlow Studio activating");
  _registry = new McpRegistry(context);
  _ado = new AdoService(_registry);
  const lm = new LmClient();
  _notes = new NotesService(context);
  _worked = new WorkedService(context);
  _standup = new StandupService(_ado, lm, _notes);

  _statusBar = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    100,
  );
  _statusBar.command = "devflowStudio.open";
  _statusBar.text = "$(checklist) ADO: …";
  _statusBar.tooltip = "Open DevFlow Studio";
  _statusBar.show();
  context.subscriptions.push(_statusBar);

  context.subscriptions.push(
    vscode.commands.registerCommand("devflowStudio.open", () => {
      DashboardPanel.show(context, _registry, _ado, _standup, _notes, _worked);
    }),
    vscode.commands.registerCommand("devflowStudio.refresh", async () => {
      await refresh();
      vscode.window.showInformationMessage("DevFlow Studio refreshed.");
    }),
    vscode.commands.registerCommand("devflowStudio.generateStandup", () => {
      DashboardPanel.show(context, _registry, _ado, _standup, _notes, _worked);
      vscode.commands.executeCommand("devflowStudio.open");
    }),
    vscode.commands.registerCommand(
      "devflowStudio.resetOnboarding",
      async () => {
        await context.globalState.update("devflowStudio.onboarded", false);
        vscode.window.showInformationMessage(
          "Onboarding reset. Reopen DevFlow Studio to see the welcome screen.",
        );
      },
    ),
  );

  context.subscriptions.push({ dispose: () => _registry.dispose() });
  context.subscriptions.push({
    dispose: () => {
      if (_pollTimer) {
        clearInterval(_pollTimer);
      }
    },
  });

  // Background bootstrap (don't block activation)
  void bootstrap();
}

async function bootstrap(): Promise<void> {
  try {
    logger.info("Starting MCP registry initialization...");
    await _registry.initialize();
    logger.info("MCP registry initialized successfully");
    await refresh();
    schedulePoll();
  } catch (e) {
    logger.error("Bootstrap failed", e);
    _statusBar.text = "$(warning) ADO: error";
    _statusBar.tooltip = e instanceof Error ? e.message : String(e);
    // Show notification for easier debugging
    const msg = e instanceof Error ? e.message : String(e);
    vscode.window
      .showWarningMessage(
        `DevFlow Studio: Failed to connect to MCP server. ${msg}`,
        "View Output",
      )
      .then((choice) => {
        if (choice === "View Output") {
          vscode.commands.executeCommand("workbench.action.output.show");
        }
      });
  }
}

async function refresh(): Promise<void> {
  try {
    const items = await _ado.listMyWorkItems({ refresh: true });
    _statusBar.text = `$(checklist) ADO: ${items.length}`;
    _statusBar.tooltip = `${items.length} assigned work items. Click to open dashboard.`;
  } catch (e) {
    logger.warn("Refresh failed", e);
    _statusBar.text = "$(warning) ADO: error";
  }
}

function schedulePoll(): void {
  if (_pollTimer) {
    clearInterval(_pollTimer);
  }
  const seconds =
    vscode.workspace
      .getConfiguration()
      .get<number>("devflowStudio.pollIntervalSeconds") ?? 300;
  if (seconds <= 0) {
    return;
  }
  _pollTimer = setInterval(() => {
    void refresh();
  }, seconds * 1000);
}

export function deactivate(): void {
  if (_pollTimer) {
    clearInterval(_pollTimer);
  }
  logger.dispose();
}
