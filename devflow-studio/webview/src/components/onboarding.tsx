import React, { useEffect, useState } from "react";
import { call } from "../lib/rpc";

interface McpServerInfo {
  id: string;
  connected: boolean;
  toolCount?: number;
  error?: string;
  source: string;
}

type Status = "idle" | "ok" | "warn" | "error";

export const Onboarding: React.FC<{ onDone: () => void }> = ({ onDone }) => {
  const [step, setStep] = useState(0);
  const [mcpStatus, setMcpStatus] = useState<Status>("idle");
  const [mcpMsg, setMcpMsg] = useState("Checking configured MCP servers…");
  const [adoStatus, setAdoStatus] = useState<Status>("idle");
  const [adoMsg, setAdoMsg] = useState("Press Test to verify your ADO connection.");

  useEffect(() => {
    void (async () => {
      try {
        const servers = await call<McpServerInfo[]>("mcp.listServers");
        const ado = servers.find((s) => s.id.toLowerCase().includes("ado"));
        if (!ado) {
          setMcpStatus("warn");
          setMcpMsg(
            "No MCP server with id containing 'ado' was found. Add one in Settings or create .vscode/mcp.json with @azure-devops/mcp.",
          );
          return;
        }
        if (ado.connected) {
          setMcpStatus("ok");
          setMcpMsg(
            `Connected to '${ado.id}' (${ado.source}) with ${ado.toolCount ?? 0} tools.`,
          );
        } else {
          setMcpStatus("error");
          setMcpMsg(`'${ado.id}' is not connected: ${ado.error ?? "unknown"}`);
        }
      } catch (e) {
        setMcpStatus("error");
        setMcpMsg(e instanceof Error ? e.message : String(e));
      }
    })();
  }, []);

  const testAdo = async (): Promise<void> => {
    setAdoStatus("idle");
    setAdoMsg("Calling wit_my_work_items…");
    try {
      const items = await call<unknown[]>("workItems.list", { refresh: true });
      setAdoStatus("ok");
      setAdoMsg(`Fetched ${items.length} assigned work items. You are signed in.`);
    } catch (e) {
      setAdoStatus("error");
      setAdoMsg(
        `Failed: ${e instanceof Error ? e.message : String(e)}. Run 'az login' in a terminal and retry.`,
      );
    }
  };

  const complete = async (): Promise<void> => {
    try {
      await call("onboarding.complete");
    } finally {
      onDone();
    }
  };

  return (
    <div className="onboarding-backdrop">
      <div className="onboarding-modal">
        <div className="onboarding-header">
          <h2>Welcome to DevFlow Studio</h2>
          <button className="secondary" onClick={() => void complete()}>
            Skip
          </button>
        </div>

        <ol className="onboarding-steps">
          <li className={step === 0 ? "active" : ""}>1. MCP connection</li>
          <li className={step === 1 ? "active" : ""}>2. Azure sign-in</li>
          <li className={step === 2 ? "active" : ""}>3. Daily standup</li>
          <li className={step === 3 ? "active" : ""}>4. Support the project</li>
        </ol>

        {step === 0 && (
          <section>
            <h3>1. Azure DevOps MCP server</h3>
            <p>
              This extension talks to ADO through a Model Context Protocol
              server. The default config in <code>.vscode/mcp.json</code> uses{" "}
              <code>npx -y @azure-devops/mcp YourOrgName</code>.
            </p>
            <p className={`status-${mcpStatus}`}>{mcpMsg}</p>
            <div className="onboarding-actions">
              <button onClick={() => setStep(1)}>Next</button>
            </div>
          </section>
        )}

        {step === 1 && (
          <section>
            <h3>2. Sign in to Azure</h3>
            <p>
              The MCP server uses your Azure CLI credentials. Run{" "}
              <code>az login</code> in a terminal if you haven't already, then
              test the connection.
            </p>
            <p className={`status-${adoStatus}`}>{adoMsg}</p>
            <div className="onboarding-actions">
              <button className="secondary" onClick={() => setStep(0)}>
                Back
              </button>
              <button onClick={() => void testAdo()}>Test connection</button>
              <button onClick={() => setStep(2)}>Next</button>
            </div>
          </section>
        )}

        {step === 2 && (
          <section>
            <h3>3. Generate your daily standup</h3>
            <p>
              Open the <strong>Standup</strong> tab and click{" "}
              <strong>Generate</strong>. The extension collects your recent
              comments, state changes, commits, and PRs from the last 24 hours
              and asks Claude (via GitHub Copilot Chat) to draft a Yesterday /
              Today / Blockers summary.
            </p>
            <p>
              You can also add personal notes to any work item from the detail
              drawer — these are stored locally and never sent to ADO.
            </p>
            <div className="onboarding-actions">
              <button className="secondary" onClick={() => setStep(1)}>
                Back
              </button>
              <button onClick={() => setStep(3)}>Next</button>
            </div>
          </section>
        )}

        {step === 3 && (
          <section>
            <h3>4. Support DevFlow Studio</h3>
            <p>
              DevFlow Studio is an <strong>open-source project</strong> built with passion to help developers like you work more efficiently with Azure DevOps. If you find it useful, we'd greatly appreciate your support!
            </p>
            <div style={{ marginTop: '1rem', marginBottom: '1rem' }}>
              <p>🌟 <strong>Star us on GitHub</strong></p>
              <p style={{ marginLeft: '1.5rem', fontSize: '0.9em', opacity: 0.9 }}>
                Your star helps others discover this extension and motivates continued development.
              </p>
            </div>
            <div style={{ marginTop: '1rem', marginBottom: '1rem' }}>
              <p>🤝 <strong>Contribute to the project</strong></p>
              <p style={{ marginLeft: '1.5rem', fontSize: '0.9em', opacity: 0.9 }}>
                Found a bug? Have a feature idea? Contributions, bug reports, and feedback are always welcome!
              </p>
            </div>
            <p style={{ marginTop: '1.5rem' }}>
              Visit us at: <a href="https://github.com/SantanSharma/DevFlow-Studio" style={{ color: '#0078d4' }}>github.com/SantanSharma/DevFlow-Studio</a>
            </p>
            <div className="onboarding-actions">
              <button className="secondary" onClick={() => setStep(2)}>
                Back
              </button>
              <button onClick={() => void complete()}>Get started</button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};
