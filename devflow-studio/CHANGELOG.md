# Change Log

All notable changes to the "DevFlow Studio" extension will be documented in this file.

## [0.1.2] - 2026-07-05

### Fixed

- 🔧 **Dashboard RPC Schema** - Fixed "Invalid RPC request" errors
  - Added missing RPC method definitions to Zod schema validator
  - Added `dashboard.metrics`, `ai.generateMotivation`, `ai.generateInsights`, `standup.history`, `clipboard.write`
  - Dashboard now loads successfully without schema validation errors
- 📊 **Simplified Dashboard Architecture** - Follows proven standup generation pattern
  - Extension loads work items internally (no longer passed from webview)
  - Removed complex parameter passing and filter state management
  - AI components now load data from extension (same as standup)
  - More reliable and maintainable data flow
- 🔧 **Dashboard Data Display** - Fixed empty dashboard widgets by adding proper field extraction
  - Added `Microsoft.VSTS.Common.ClosedDate` to Azure DevOps field requests
  - Implemented fallback logic: uses `changedDate` for completed items without `closedDate`
  - Updated completed state detection to support custom state names (configurable)
  - Made state matching case-insensitive for better compatibility
  - Story Points and Velocity charts now display data correctly
- 📊 **Completed State Detection** - Improved flexibility in recognizing completed work
  - Now supports: "Closed", "Resolved", "Done", "Dev Complete" (case-insensitive)
  - Easily extensible for other state names
  - Completed vs Planned widget shows accurate counts
- 🤖 **AI Generation** - Enhanced LLM integration and error handling
  - AI motivation and insights use same proven pattern as standup generation
  - Added detailed logging for model selection and generation
  - Better error messages when LLM is unavailable
  - Helps identify why AI features may fail

### Technical

- Added `activeCount` and `blockedCount` to dashboard metrics
- Refactored dashboard service with helper methods: `_isCompleted()`, `_getEffectiveClosedDate()`
- All date-based calculations now use effective closed dates with fallback
- Improved code maintainability for state-based filtering
- Comprehensive debug logging throughout data flow

## [0.1.0] - 2026-07-04

### Initial Release

#### Features

- 🎯 **Integrated Dashboard** - View all assigned Azure DevOps work items directly in VS Code
  - Grid view with sortable columns
  - Kanban board view for visual task management
  - Real-time synchronization (auto-refresh every 5 minutes)
  - Rich filtering and search capabilities
- 📝 **Personal Journal** - Add private, local-only notes to any work item
  - Timestamped entries with markdown support
  - Quick entry with keyboard shortcuts (Ctrl+Enter)
  - Mark entries as done or delete them
  - Perfect for tracking small progress updates that don't belong in ADO

- 🤖 **AI-Powered Standup Generation** - One-click standup using Claude AI
  - Analyzes your recent work (comments, state changes, commits, PRs)
  - Generates structured Yesterday/Today/Blockers format
  - Real-time streaming results
  - Configurable time window (default: 24 hours)

- 📊 **"My Day" Widget** - Quick overview dashboard showing:
  - Total assigned items
  - Active items count
  - Blocked items (with alerts)
  - Items changed in last 24 hours
  - Resolved items count
  - Story points summary

- ⚙️ **Flexible MCP Integration**
  - Works with any MCP server exposing Azure DevOps tools
  - Supports workspace, user, and custom MCP configurations
  - Add custom MCP servers through the Settings page
  - No hard-coded credentials - uses your existing Azure CLI auth

- 🎓 **Interactive Onboarding** - First-time setup wizard
  - Step-by-step MCP server configuration guide
  - Azure sign-in verification
  - Standup generation walkthrough
  - Community contribution invitation

#### Technical

- Built with React + TypeScript + Vite
- Uses VS Code Extension API + Model Context Protocol
- GitHub Copilot Language Model API integration
- Production-optimized builds with esbuild
- Clean, modular architecture with no hardcoded configs

---

## Future Roadmap

Planned features for upcoming releases:

- Kanban board drag-and-drop for state changes
- Custom work item queries
- Sprint velocity charts
- PR integration in work item details
- Configurable dashboard layouts
- Team standup aggregation
- Export standup history

---

Check the [GitHub repository](https://github.com/SantanSharma/DevFlow-Studio) for latest updates and to contribute!
