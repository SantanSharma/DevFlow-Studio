# DevFlow Studio

![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)
![VS Code](https://img.shields.io/badge/VS%20Code-^1.95.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

AI-powered Azure DevOps dashboard with smart standup generation and personal journal. Brings your work directly into VS Code.

## ✨ Features

- 🎯 **Integrated Dashboard** - View all assigned work items with Grid and Kanban board views
- 📝 **Personal Journal** - Add private, local-only notes to any work item
- 🤖 **AI-Powered Standup** - One-click standup generation using Claude AI
- 📊 **"My Day" Widget** - Quick overview of your work at a glance
- ⚙️ **Flexible MCP Integration** - Works with any MCP server exposing Azure DevOps tools

## 🚀 Quick Start

### Prerequisites

1. **Node.js 20+** and **npm** installed
2. **Azure CLI** installed and authenticated: `az login`
3. **VS Code 1.95.0+**
4. **GitHub Copilot subscription** (for AI standup generation)

### Installation

1. Open VS Code Extensions (Ctrl+Shift+X)
2. Search for "DevFlow Studio"
3. Click Install

### Setup

1. **Configure MCP Server** - Create `.vscode/mcp.json`:

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

2. **Configure Extension Settings** (Ctrl+,):
   - **ADO Project**: Your Azure DevOps project name
   - **Me Email**: Your ADO email (e.g., `user@example.com`)
   - **Me Display Name**: Your display name in ADO

3. **Open Dashboard**: Press **Ctrl+Alt+A** (Cmd+Alt+A on Mac)

## 🤝 Contributing

Contributions welcome! Please fork the repository, create a feature branch, and submit a pull request.

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

## 👤 Author

**Santan Sharma**

- GitHub: [@SantanSharma](https://github.com/SantanSharma)
- Email: [pingsantan@gmail.com](mailto:pingsantan@gmail.com)

## ⭐ Support

If you find DevFlow Studio helpful, please:

- ⭐ **Star the repository** on [GitHub](https://github.com/SantanSharma/DevFlow-Studio)
- 📝 **Leave a review** on the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=SantanSharma.devflow-studio)
- 🐛 **Report issues** on [GitHub Issues](https://github.com/SantanSharma/DevFlow-Studio/issues)

---

<p align="center">Made with ❤️ by Santan Sharma</p>
