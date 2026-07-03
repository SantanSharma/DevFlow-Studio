# DevFlow Studio

A user-centric VS Code extension that pulls **your** Azure DevOps work (tasks, stories, bugs, support items) into a single dashboard with rich filtering, a todo-style tracker, and a one-click **Claude-powered standup generator**.

- Reuses any MCP server configured in `.vscode/mcp.json` or your user `mcp.json`.
- Adds custom MCP servers from the Settings page (stored in `devflowStudio.customMcpServers`).
- Talks to Claude through VS Code's Language Model API — no separate API key.
- Auth to Azure DevOps is whatever the underlying MCP server uses (the official `@azure-devops/mcp` uses your Azure CLI session — run `az login` once).

## Architecture (quick map)

```
devflow-studio/
├── src/                       extension host (Node)
│   ├── extension.ts           activation, status bar, polling
│   ├── panel.ts               WebviewPanel + CSP + bundle loader
│   ├── mcp/
│   │   ├── client.ts          stdio Client pool (@modelcontextprotocol/sdk)
│   │   └── registry.ts        merges workspace/user/custom MCP configs
│   ├── services/
│   │   ├── ado-service.ts     typed wrappers over ADO MCP tools (cached)
│   │   ├── lm-client.ts       vscode.lm Claude wrapper
│   │   └── standup-service.ts collects signals + asks Claude
│   ├── rpc/
│   │   ├── schema.ts          Zod request/response/event schemas
│   │   └── bridge.ts          dispatches webview RPC calls
│   └── util/logger.ts
└── webview/                   React 18 + Vite + TS
    └── src/
        ├── app.tsx, main.tsx, styles.css
        ├── lib/rpc.ts         postMessage <-> Promise bridge
        ├── state/store.ts     Zustand store + view/filter logic
        ├── routes/            dashboard, standup, settings
        └── components/        grid, filter-bar, drawer, my-day widget
```

## Prerequisites

1. **Node.js 20+** and **npm**.
2. **Azure CLI** signed in: `az login` (required by `@azure-devops/mcp`).
3. An MCP server exposing the ADO `wit_*` / `repo_*` tools — already wired up in this workspace at `.vscode/mcp.json`:

   ```jsonc
   {
     "servers": {
       "ado": {
         "type": "stdio",
         "command": "npx",
         "args": ["-y", "@azure-devops/mcp", "OrgName"],
       },
     },
   }
   ```

## Install and run

From the `devflow-studio` folder:

```powershell
cd devflow-studio
npm install
npm --prefix webview install
npm run build
```

Then open the workspace root in VS Code and press **F5** ("Run Extension"). In the new Extension Development Host:

- `Ctrl+Shift+A` (or **DevFlow Studio: Open** from the Command Palette) opens the dashboard.
- The status bar shows your assigned-item count.
- **Standup** tab → set window → **Generate**.

## Configuration

| Setting                             | Default | Purpose                                                 |
| ----------------------------------- | ------- | ------------------------------------------------------- |
| `devflowStudio.adoMcpServerId`      | `ado`   | Id of the MCP server in `mcp.json` to use for ADO tools |
| `devflowStudio.adoProject`          | (empty) | Project name passed to batch fetches                    |
| `devflowStudio.pollIntervalSeconds` | `300`   | Background refresh interval (0 disables)                |
| `devflowStudio.standupWindowHours`  | `24`    | Default look-back window for standup                    |
| `devflowStudio.customMcpServers`    | `[]`    | Added via Settings page                                 |

## What the standup pulls

For the configured window, collected from your assigned items:

1. Comments **you** authored
2. State transitions **you** made
3. Items in a **blocked** state
4. Items in your current sprint with an active state (today's plan)

The signals are formatted into a structured prompt; Claude (selected via `vscode.lm.selectChatModels({ vendor: 'copilot', family: 'claude-*' })`) drafts the **Yesterday / Today / Blockers** Markdown. Output streams into the panel.

## Roadmap (v0.2+)

- Kanban view with drag-to-change-state
- Personal local notes per work item (todo-app behaviour without polluting ADO)
- Saved custom views/queries
- Commit/PR signals in standup (requires repo MCP tool wiring)
- Offline-aware caching + delta polling
- Onboarding tour
- vsix packaging via `vsce`

## Troubleshooting

- **Status bar shows "ADO: error"** — open **Output → DevFlow Studio** for the stack trace. Most often `az login` has expired.
- **Standup says no Claude model available** — sign into GitHub Copilot in VS Code and ensure a Claude model is enabled in your Copilot plan, or wait for the next session.
- **Empty dashboard** — check Settings → MCP servers shows `ado` as _connected_. If not, the `npx -y @azure-devops/mcp ...` command failed; try running it manually to see the error.
