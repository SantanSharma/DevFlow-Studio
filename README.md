# DevFlow Studio

![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)
![VS Code](https://img.shields.io/badge/VS%20Code-^1.95.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

I built DevFlow Studio because I was tired of switching between VS Code and Azure DevOps a hundred times a day. Now I can see my work items, add notes, and generate standups right from my editor.

## 🚀 What Makes It Useful?

**No More Context Switching**  
Stop jumping between VS Code and your browser just to check work items. Everything you need is right here.

**AI Writes Your Standups**  
Honestly, who enjoys writing standup updates? Click a button and let Claude generate them based on what you've actually been working on.

**Keep Personal Notes**  
Sometimes you need to jot down quick thoughts or blockers that aren't ready for official comments. These notes stay on your machine - never synced to ADO.

**Grid or Kanban, Your Choice**  
View your work items however you like. Grid for lists, Kanban for boards. Filter by sprint, status, or whatever you need.

**Built on MCP**  
Uses the Model Context Protocol, so you can swap out the backend if you want. It's just standard tooling.

## ✨ Core Features

### 🎯 **Azure DevOps Dashboard**

See all your assigned work items without leaving VS Code. Toggle between Grid and Kanban views. Filter by sprint, status, or assignee - whatever helps you stay organized.

### 📝 **Personal Notes**

Add quick notes to any work item. They stay local on your machine and never get pushed to Azure DevOps. Great for tracking things you're thinking through or debugging clues.

### 🤖 **AI Standup Generator**

Click a button, get a standup report. Claude reads your work items and notes, then writes up what you did, what you're doing, and any blockers. Saves a ton of time.

### 📊 **"My Day" Widget**

Quick glance at what's on your plate today. Active items, upcoming tasks, blockers - all in one spot.

### ⚙️ **MCP Architecture**

Built on Model Context Protocol, so it works with any MCP server that talks to Azure DevOps. Easy to extend or customize if you need to.

## 🚀 Quick Start

### What You'll Need

1. **Node.js 20+** and **npm**
2. **Azure CLI** - make sure you've run `az login`
3. **VS Code 1.95.0 or newer**
4. **GitHub Copilot** - only needed if you want AI standup generation

### Installing

1. Open Extensions in VS Code (Ctrl+Shift+X)
2. Search for "DevFlow Studio"
3. Hit Install

### Setup

#### Step 1: Set Up MCP Server

You'll need to tell DevFlow Studio how to connect to Azure DevOps through MCP:

1. Create or edit `.vscode/mcp.json` in your workspace
2. Add this configuration:

   ```json
   {
     "servers": {
       "ado": {
         "type": "stdio",
         "command": "npx",
         "args": ["-y", "@azure-devops/mcp", "YourOrgName"]
       }
     }
   }
   ```

   Just replace `YourOrgName` with your actual org name.

#### Step 2: Configure Extension Settings

The extension needs to know a few things about your ADO setup. Pick whichever way is easier for you:

**Option A: Use the Settings UI**

1. Open Settings: **Ctrl+,** (or **Cmd+,** on Mac)
2. Search for **"devflow"**
3. Fill in these settings:
   - **Devflow-studio: Ado Project** _(Required)_
     - Your project name from Azure DevOps
     - Example: `MyTeamProject`
   - **Devflow-studio: Me Email** _(Required)_
     - Your email in Azure DevOps
     - Example: `yourname@company.com`
     - Used to find "your" work items
   - **Devflow-studio: Me Display Name** _(Recommended)_
     - How your name shows up in ADO
     - Example: `John Doe`
   - **Devflow-studio: Saved Query Id** _(Optional)_
     - Want to use a saved query instead? Put the path or GUID here
     - Example: `"My Queries/SS-WorkItems"` or `"a1b2c3d4-..."`
     - Handy if you want custom filtering beyond just "assigned to me"
   - **Devflow-studio: Extra Assignee Fields** _(Optional)_
     - If your org uses custom assignee fields, list them here
     - Example: `["Custom.Dev", "Custom.QA"]`
     - Most people can leave this empty

**Option B: Edit settings.json Directly**

1. Open Command Palette: **Ctrl+Shift+P** (or **Cmd+Shift+P** on Mac)
2. Search for **"Preferences: Open User Settings (JSON)"**
3. Add this:

   ```json
   {
     "devflow-studio.adoProject": "MyTeamProject",
     "devflow-studio.meEmail": "yourname@company.com",
     "devflow-studio.meDisplayName": "John Doe",
     "devflow-studio.savedQueryId": "My Queries/SS-WorkItems",
     "devflow-studio.extraAssigneeFields": []
   }
   ```

**What Each Setting Does:**

| Setting               | Required       | What It's For                           | Example                     |
| --------------------- | -------------- | --------------------------------------- | --------------------------- |
| `adoProject`          | ✅ Yes         | Your Azure DevOps project name          | `"MyTeamProject"`           |
| `meEmail`             | ✅ Yes         | Your email in ADO                       | `"you@company.com"`         |
| `meDisplayName`       | ⚠️ Recommended | Your display name in ADO                | `"John Doe"`                |
| `savedQueryId`        | ❌ Optional    | Use a saved query instead of "my items" | `"My Queries/SS-WorkItems"` |
| `extraAssigneeFields` | ❌ Optional    | Custom assignee fields (if you use any) | `["Custom.Dev"]`            |

#### Step 3: Verify Configuration

1. Open the dashboard: **Ctrl+Alt+A** (or **Cmd+Alt+A** on Mac)
2. If everything's set up right, you'll see:
   - ✅ Onboarding wizard (first time only)
   - ✅ Your work items in the Grid view
   - ✅ "My Day" widget with your active stuff

**If Something's Not Working:**

- **No work items?**
  - Double-check your `meEmail` matches exactly what's in Azure DevOps
  - Make sure `adoProject` is spelled right (it's case-sensitive)
- **MCP errors?**
  - Run `az login` to authenticate Azure CLI
  - Verify your org name in `.vscode/mcp.json`
- **Want to see onboarding again?**
  - **Ctrl+Shift+P** → "DevFlow Studio: Reset Onboarding"

#### Step 4: You're Ready to Go

Here's what you can do:

- **Open Dashboard**: `Ctrl+Alt+A` or `Cmd+Alt+A`
- **Add Notes**: Click any work item, go to "Notes" tab
- **Generate Standup**: "Standup" tab → "Generate Standup" button
- **Switch Views**: Toggle between Grid and Kanban
- **Filter Stuff**: Use the filter bar to find what you need

## 🤝 Contributing

Found a bug or have an idea? Feel free to fork the repo, make your changes, and send a PR. Contributions are always welcome!

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

## 👤 Author

**Santan Sharma**

- GitHub: [@SantanSharma](https://github.com/SantanSharma)
- Email: [pingsantan@gmail.com](mailto:pingsantan@gmail.com)

## ⭐ Support This Project

If you find this useful:

- ⭐ Give it a star on [GitHub](https://github.com/SantanSharma/DevFlow-Studio)
- 📝 Leave a review on the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=SantanSharma.devflow-studio)
- 🐛 Report bugs or suggest features on [GitHub Issues](https://github.com/SantanSharma/DevFlow-Studio/issues)

---

<p align="center">Made with ❤️ by Santan Sharma</p>
