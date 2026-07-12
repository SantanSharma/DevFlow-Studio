import React, { useEffect, useState } from 'react';
import { call } from '../lib/rpc';
import { useStore } from '../state/store';
import { DashboardSettings } from '../components/settings/dashboard-settings';

interface McpServer {
    id: string;
    command: string;
    args: string[];
    source: 'workspace' | 'user' | 'custom';
    connected: boolean;
    toolCount?: number;
    error?: string;
}

interface SettingsState {
    adoMcpServerId?: string;
    adoProject?: string;
    orgUrl?: string;
    pollIntervalSeconds?: number;
    standupWindowHours?: number;
    meEmail?: string;
    meDisplayName?: string;
}

type SettingsTab = 'general' | 'dashboard' | 'mcp';

const TABS: ReadonlyArray<readonly [SettingsTab, string]> = [
    ['general', 'General'],
    ['dashboard', 'Dashboard Configuration'],
    ['mcp', 'MCP Servers'],
];

export const Settings: React.FC = () => {
    const [activeTab, setActiveTab] = useState<SettingsTab>('general');
    const [servers, setServers] = useState<McpServer[]>([]);
    const [settings, setSettings] = useState<SettingsState>({});
    const [error, setError] = useState<string | undefined>();
    const [newServer, setNewServer] = useState({ id: '', command: '', args: '' });
    const [diag, setDiag] = useState<unknown>();
    const [diagBusy, setDiagBusy] = useState(false);
    const loadSettings = useStore((s) => s.loadSettings);

    const refresh = async (): Promise<void> => {
        try {
            const [s, cfg] = await Promise.all([
                call<McpServer[]>('mcp.listServers'),
                call<SettingsState>('settings.get'),
            ]);
            setServers(s);
            setSettings(cfg);
            // Keep the store's settings slice (workflow/kanban config) in sync too.
            await loadSettings();
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        }
    };

    useEffect(() => { void refresh(); }, []);

    const addServer = async (): Promise<void> => {
        if (!newServer.id.trim() || !newServer.command.trim()) {
            return;
        }
        try {
            await call('mcp.addServer', {
                id: newServer.id.trim(),
                command: newServer.command.trim(),
                args: newServer.args.split(/\s+/).filter(Boolean),
            });
            setNewServer({ id: '', command: '', args: '' });
            await refresh();
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        }
    };

    const removeServer = async (id: string): Promise<void> => {
        await call('mcp.removeServer', { id });
        await refresh();
    };

    const saveSetting = async (key: string, value: unknown): Promise<void> => {
        await call('settings.set', { key, value });
        await refresh();
    };

    const runDiag = async (): Promise<void> => {
        setDiagBusy(true);
        setError(undefined);
        try {
            const r = await call<unknown>('diag.run');
            setDiag(r);
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        } finally {
            setDiagBusy(false);
        }
    };

    return (
        <div className="settings">
            <h2 style={{ marginTop: 0 }}>Settings</h2>
            <div className="settings-tabs">
                {TABS.map(([id, label]) => (
                    <button
                        key={id}
                        type="button"
                        className={`settings-tab ${activeTab === id ? 'active' : ''}`}
                        onClick={() => setActiveTab(id)}
                    >
                        {label}
                    </button>
                ))}
            </div>
            {error && <div className="error">{error}</div>}

            {activeTab === 'general' && (
                <>
                    <div className="field">
                        <label>ADO MCP server id</label>
                        <input
                            type="text"
                            defaultValue={settings.adoMcpServerId ?? ''}
                            onBlur={(e) => { void saveSetting('adoMcpServerId', e.target.value); }}
                        />
                    </div>
                    <div className="field">
                        <label>ADO project</label>
                        <input
                            type="text"
                            defaultValue={settings.adoProject ?? ''}
                            onBlur={(e) => { void saveSetting('adoProject', e.target.value); }}
                        />
                    </div>
                    <div className="field">
                        <label>ADO organization URL (for &ldquo;Open in Azure DevOps&rdquo; links)</label>
                        <input
                            type="text"
                            placeholder="e.g. https://dev.azure.com/MyCompany"
                            defaultValue={settings.orgUrl ?? ''}
                            onBlur={(e) => { void saveSetting('adoOrgUrl', e.target.value.trim()); }}
                        />
                    </div>
                    <div className="field">
                        <label>Your ADO email (used in WIQL instead of @Me)</label>
                        <input
                            type="text"
                            placeholder="e.g. user@example.com"
                            defaultValue={settings.meEmail ?? ''}
                            onBlur={(e) => { void saveSetting('meEmail', e.target.value.trim()); }}
                        />
                    </div>
                    <div className="field">
                        <label>Your ADO display name (combined with email as 'Name &lt;email&gt;' in WIQL)</label>
                        <input
                            type="text"
                            placeholder="e.g. Jane Doe"
                            defaultValue={settings.meDisplayName ?? ''}
                            onBlur={(e) => { void saveSetting('meDisplayName', e.target.value.trim()); }}
                        />
                    </div>
                    <div className="field">
                        <label>Poll interval (seconds, 0 to disable)</label>
                        <input
                            type="number"
                            defaultValue={settings.pollIntervalSeconds ?? 300}
                            onBlur={(e) => { void saveSetting('pollIntervalSeconds', Number(e.target.value) || 0); }}
                        />
                    </div>
                    <div className="field">
                        <label>Default standup window (hours)</label>
                        <input
                            type="number"
                            defaultValue={settings.standupWindowHours ?? 24}
                            onBlur={(e) => { void saveSetting('standupWindowHours', Number(e.target.value) || 24); }}
                        />
                    </div>
                </>
            )}

            {activeTab === 'dashboard' && (
                <DashboardSettings onError={setError} />
            )}

            {activeTab === 'mcp' && (
                <>
                    <h3>MCP servers</h3>
                    <p style={{ opacity: 0.7, fontSize: 12 }}>Discovered from <code>.vscode/mcp.json</code>, your user <code>mcp.json</code>, and custom adds below.</p>
                    {servers.map((s) => (
                        <div key={s.id} className="server">
                            <div className="row">
                                <strong>{s.id}</strong>
                                <span style={{ opacity: 0.6, fontSize: 11 }}>[{s.source}]</span>
                                <span style={{ marginLeft: 'auto', color: s.connected ? '#2ea043' : '#d73a49' }}>
                                    {s.connected ? `connected · ${s.toolCount} tools` : 'disconnected'}
                                </span>
                                {s.source === 'custom' && (
                                    <button className="secondary" onClick={() => removeServer(s.id)}>Remove</button>
                                )}
                            </div>
                            <div className="row" style={{ marginTop: 4 }}>
                                <code>{s.command} {s.args.join(' ')}</code>
                            </div>
                            {s.error && <div className="error" style={{ padding: '4px 0' }}>{s.error}</div>}
                        </div>
                    ))}

                    <h3 style={{ marginTop: 24 }}>Add custom MCP server</h3>
                    <div className="field">
                        <label>Id</label>
                        <input type="text" value={newServer.id} onChange={(e) => setNewServer({ ...newServer, id: e.target.value })} />
                    </div>
                    <div className="field">
                        <label>Command</label>
                        <input type="text" placeholder="npx" value={newServer.command} onChange={(e) => setNewServer({ ...newServer, command: e.target.value })} />
                    </div>
                    <div className="field">
                        <label>Args (space-separated)</label>
                        <input type="text" placeholder="-y @some/mcp-server arg1" value={newServer.args} onChange={(e) => setNewServer({ ...newServer, args: e.target.value })} />
                    </div>
                    <button onClick={addServer}>Add</button>

                    <h3 style={{ marginTop: 24 }}>Diagnostics</h3>
                    <p style={{ opacity: 0.7, fontSize: 12 }}>
                        Runs the WIQL queries used to fetch your work items and shows the per-field result
                        counts plus a sample item fetched via the batch endpoint. Use this to confirm the
                        ADO MCP server is reachable and that your custom assignee fields (e.g.
                        <code> Custom.Dev</code>) resolve to your identity.
                    </p>
                    <button onClick={runDiag} disabled={diagBusy}>{diagBusy ? 'Running…' : 'Run diagnostics'}</button>
                    {diag !== undefined && (
                        <pre style={{ marginTop: 8, padding: 8, background: 'rgba(255,255,255,0.04)', maxHeight: 360, overflow: 'auto', fontSize: 11 }}>{JSON.stringify(diag, null, 2)}</pre>
                    )}
                </>
            )}
        </div>
    );
};
