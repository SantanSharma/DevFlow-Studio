import React, { useEffect, useMemo, useState } from 'react';
import { useStore, applyView, applyFilters } from './state/store';
import { Dashboard } from './routes/dashboard';
import { StandupPanel } from './routes/standup';
import { Settings } from './routes/settings';
import { Onboarding } from './components/onboarding';
import { call } from './lib/rpc';

type Tab = 'dashboard' | 'standup' | 'settings';

export const App: React.FC = () => {
    const [tab, setTab] = useState<Tab>('dashboard');
    const [showOnboarding, setShowOnboarding] = useState(false);
    const load = useStore((s) => s.load);
    const loadNotes = useStore((s) => s.loadNotes);
    const loadWorked = useStore((s) => s.loadWorked);
    const loadSettings = useStore((s) => s.loadSettings);
    const items = useStore((s) => s.items);
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

    const filtered = useMemo(
        () => applyFilters(applyView(items, view, notes, worked), filters),
        [items, view, filters, notes, worked],
    );

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
                {tab === 'dashboard' && (
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
                        onClick={() => { setView(id); setTab('dashboard'); }}
                    >
                        <span>{label}</span>
                        <span>{applyView(items, id, notes, worked).length}</span>
                    </div>
                ))}

                <div className="section-title">App</div>
                <div className={`view ${tab === 'standup' ? 'active' : ''}`} onClick={() => setTab('standup')}>Standup</div>
                <div className={`view ${tab === 'settings' ? 'active' : ''}`} onClick={() => setTab('settings')}>Settings</div>
            </aside>

            <main className="main">
                {tab === 'dashboard' && <Dashboard items={filtered} allItems={items} />}
                {tab === 'standup' && <StandupPanel />}
                {tab === 'settings' && <Settings />}
            </main>

            {showOnboarding && <Onboarding onDone={() => setShowOnboarding(false)} />}
        </div>
    );
};
