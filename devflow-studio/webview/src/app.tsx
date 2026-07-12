import React, { useEffect, useMemo, useState } from 'react';
import { useStore, applyView, applyFilters, type ViewId, type WorkItem } from './state/store';
import { PersonalDashboard } from './routes/personal-dashboard';
import { Dashboard } from './routes/dashboard';
import { StandupPanel } from './routes/standup';
import { Settings } from './routes/settings';
import { Onboarding } from './components/onboarding';
import { WorkItemsDrawer } from './components/work-items-drawer';
import { call } from './lib/rpc';

type Tab = 'overview' | 'work-items' | 'standup' | 'settings';

export const App: React.FC = () => {
    const [tab, setTab] = useState<Tab>('overview');
    const [showOnboarding, setShowOnboarding] = useState(false);
    const load = useStore((s) => s.load);
    const loadNotes = useStore((s) => s.loadNotes);
    const loadWorked = useStore((s) => s.loadWorked);
    const loadSettings = useStore((s) => s.loadSettings);
    const items = useStore((s) => s.items);
    const loading = useStore((s) => s.loading);
    const error = useStore((s) => s.error);
    const notes = useStore((s) => s.notes);
    const worked = useStore((s) => s.worked);
    const view = useStore((s) => s.view);
    const filters = useStore((s) => s.filters);
    const boardMode = useStore((s) => s.boardMode);
    const setBoardMode = useStore((s) => s.setBoardMode);
    const setSearch = useStore((s) => s.setSearch);
    const setView = useStore((s) => s.setView);

    useEffect(() => { void load(false); }, [load]);
    useEffect(() => { void loadNotes(); }, [loadNotes]);
    useEffect(() => { void loadWorked(); }, [loadWorked]);
    useEffect(() => { void loadSettings(); }, [loadSettings]);
    useEffect(() => {
        void (async () => {
            try {
                const r = await call<{ done: boolean }>('onboarding.get');
                if (!r.done) {
                    setShowOnboarding(true);
                }
            } catch {
                /* ignore */
            }
        })();
    }, []);

    const openDrawer = useStore((s) => s.openWorkItemsDrawer);
    const workflowCategories = useStore((s) => s.workflowCategories);

    const filtered = useMemo(
        () => applyFilters(applyView(items, view, notes, worked), filters),
        [items, view, filters, notes, worked],
    );

    // One computation point for the sidebar counts and their drawer contents;
    // deliberately excludes `filters` (counts are pre-filter by design) and
    // `view`. workflowCategories is a dependency because applyView derives its
    // blocked/resolved sets from the configured categories.
    const viewItems = useMemo(() => {
        const ids: ViewId[] = ['active', 'today', 'blocked', 'sprint', 'todo', 'worked', 'all', 'resolved'];
        return Object.fromEntries(
            ids.map((id) => [id, applyView(items, id, notes, worked)]),
        ) as Record<ViewId, WorkItem[]>;
    }, [items, notes, worked, workflowCategories]);

    return (
        <div className="app">
            <header className="app-header">
                <h1>DevFlow Studio</h1>
                <input
                    type="text"
                    placeholder="Search title or #id"
                    value={filters.search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{ width: 280 }}
                />
                {tab === 'work-items' && (
                    <div className="board-toggle">
                        <button
                            className={boardMode === 'grid' ? '' : 'secondary'}
                            onClick={() => setBoardMode('grid')}
                        >Grid</button>
                        <button
                            className={boardMode === 'kanban' ? '' : 'secondary'}
                            onClick={() => setBoardMode('kanban')}
                        >Kanban</button>
                    </div>
                )}
                <div className="spacer" />
                <button className="secondary" onClick={() => setShowOnboarding(true)}>Help</button>
                <button onClick={() => load(true)}>Refresh</button>
            </header>

            <aside className="sidebar">
                <div className="section-title">Dashboard</div>
                <div className={`view ${tab === 'overview' ? 'active' : ''}`} onClick={() => setTab('overview')}>
                    <span>My Overview</span>
                </div>

                <div className="section-title">Views</div>
                {([
                    ['active', 'My Active'],
                    ['today', 'Changed Today'],
                    ['blocked', 'Blocked'],
                    ['sprint', 'Current Sprint'],
                    ['todo', 'My Notes / Todo'],
                    ['worked', 'My Worked Items'],
                    ['all', 'All Assigned'],
                    ['resolved', 'Resolved'],
                ] as const).map(([id, label]) => (
                    <div
                        key={id}
                        className={`view ${view === id ? 'active' : ''}`}
                        onClick={() => { setView(id); setTab('work-items'); }}
                    >
                        <span>{label}</span>
                        <span
                            className="view-count metric-clickable"
                            role="button"
                            tabIndex={0}
                            title={`List '${label}' items without leaving this page`}
                            onClick={(e) => {
                                // Badge opens the drawer; the row click (navigate) must not fire.
                                e.stopPropagation();
                                openDrawer({
                                    title: label,
                                    items: viewItems[id],
                                    sourceDescription: `Items matching the '${label}' view.`,
                                });
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    openDrawer({
                                        title: label,
                                        items: viewItems[id],
                                        sourceDescription: `Items matching the '${label}' view.`,
                                    });
                                }
                            }}
                        >{viewItems[id].length}</span>
                    </div>
                ))}

                <div className="section-title">App</div>
                <div className={`view ${tab === 'standup' ? 'active' : ''}`} onClick={() => setTab('standup')}>Standup</div>
                <div className={`view ${tab === 'settings' ? 'active' : ''}`} onClick={() => setTab('settings')}>Settings</div>
            </aside>

            <main className="main">
                {tab === 'overview' && (
                    <>
                        {loading && items.length === 0 && (
                            <div style={{ padding: 40, textAlign: 'center' }}>
                                <h3>Loading your dashboard...</h3>
                                <p>Fetching work items from Azure DevOps...</p>
                            </div>
                        )}
                        {error && items.length === 0 && (
                            <div style={{ padding: 40, textAlign: 'center', color: '#f44336' }}>
                                <h3>Error loading work items</h3>
                                <p>{error}</p>
                                <button onClick={() => load(true)}>Retry</button>
                            </div>
                        )}
                        {!loading && items.length === 0 && !error && (
                            <div style={{ padding: 40, textAlign: 'center' }}>
                                <h3>No work items found</h3>
                                <p>Check your Azure DevOps configuration in Settings.</p>
                            </div>
                        )}
                        {items.length > 0 && <PersonalDashboard allItems={items} />}
                    </>
                )}
                {tab === 'work-items' && <Dashboard items={filtered} allItems={items} />}
                {tab === 'standup' && <StandupPanel />}
                {tab === 'settings' && <Settings />}
            </main>

            {showOnboarding && <Onboarding onDone={() => setShowOnboarding(false)} />}
            <WorkItemsDrawer />
        </div>
    );
};
