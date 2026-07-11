import React, { useEffect, useState } from 'react';
import { call } from '../lib/rpc';
import { useStore } from '../state/store';

interface Props {
    id: number;
    onClose: () => void;
}

interface Detail {
    id?: number;
    fields?: Record<string, unknown>;
    relations?: Array<{ rel: string; url: string }>;
}

export const DetailDrawer: React.FC<Props> = ({ id, onClose }) => {
    const [detail, setDetail] = useState<Detail | null>(null);
    const [error, setError] = useState<string | undefined>();
    const [comment, setComment] = useState('');
    const [newState, setNewState] = useState('');
    const [journalDraft, setJournalDraft] = useState('');
    const updateState = useStore((s) => s.updateState);
    const note = useStore((s) => s.notes[String(id)]);
    const appendNoteEntry = useStore((s) => s.appendNoteEntry);
    const deleteNoteEntry = useStore((s) => s.deleteNoteEntry);
    const toggleNoteDone = useStore((s) => s.toggleNoteDone);
    const openExternal = useStore((s) => s.openExternal);
    const orgUrl = useStore((s) => s.orgUrl);
    const project = useStore((s) => s.project);
    const items = useStore((s) => s.items);
    const isWorked = useStore((s) => !!s.worked[String(id)]);
    const pinWorked = useStore((s) => s.pinWorked);
    const unpinWorked = useStore((s) => s.unpinWorked);

    useEffect(() => {
        setDetail(null);
        setError(undefined);
        setJournalDraft('');
        call<Detail>('workItems.detail', { id })
            .then(setDetail)
            .catch((e) => setError(e instanceof Error ? e.message : String(e)));
    }, [id]);

    const title = (detail?.fields?.['System.Title'] as string) ?? `#${id}`;
    const state = (detail?.fields?.['System.State'] as string) ?? '';
    const desc = (detail?.fields?.['System.Description'] as string) ?? '';
    const adoUrl = orgUrl && project
        ? `${orgUrl.replace(/\/+$/, '')}/${encodeURIComponent(project)}/_workitems/edit/${id}`
        : undefined;

    const submitJournal = async (): Promise<void> => {
        const text = journalDraft.trim();
        if (!text) return;
        await appendNoteEntry(id, text);
        setJournalDraft('');
    };

    const entries = note?.entries ?? [];
    const sortedEntries = [...entries].sort((a, b) => b.ts.localeCompare(a.ts));

    return (
        <div className="drawer">
            <span className="close" onClick={onClose}>✕</span>
            <h2 style={{ marginTop: 0 }}>#{id} {title}</h2>
            <div style={{ marginBottom: 8, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    {adoUrl ? (
                        <button
                            type="button"
                            className="external-link"
                            style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }}
                            onClick={() => void openExternal(adoUrl)}
                        >
                            Open in Azure DevOps ↗
                        </button>
                    ) : (
                        <span style={{ fontSize: 11, opacity: 0.6 }}>
                            Set your ADO organization URL in Settings to enable &ldquo;Open in Azure DevOps&rdquo; links.
                        </span>
                    )}
                    <button
                        type="button"
                        className={isWorked ? 'secondary' : ''}
                        title={isWorked ? 'Remove from My Worked Items' : 'Save to My Worked Items (local)'}
                        onClick={() => {
                            if (isWorked) {
                                void unpinWorked(id);
                                return;
                            }
                            const live = items.find((i) => i.id === id);
                            const snapshot = live ?? {
                                id,
                                type: String(detail?.fields?.['System.WorkItemType'] ?? ''),
                                state,
                                title,
                                iterationPath: detail?.fields?.['System.IterationPath'] as string | undefined,
                                areaPath: detail?.fields?.['System.AreaPath'] as string | undefined,
                                assignedTo: undefined,
                                priority: detail?.fields?.['Microsoft.VSTS.Common.Priority'] as number | undefined,
                                tags: [],
                                changedDate: detail?.fields?.['System.ChangedDate'] as string | undefined,
                                parentId: detail?.fields?.['System.Parent'] as number | undefined,
                            };
                            void pinWorked(snapshot);
                        }}
                    >
                        {isWorked ? '★ Pinned to My Worked' : '☆ Save to My Worked'}
                    </button>
            </div>
            {error && <div className="error">{error}</div>}
            {!detail && !error && <div>Loading…</div>}
            {detail && (
                <>
                    <div><strong>State:</strong> {state}</div>
                    <div><strong>Type:</strong> {String(detail.fields?.['System.WorkItemType'] ?? '')}</div>
                    <div><strong>Iteration:</strong> {String(detail.fields?.['System.IterationPath'] ?? '')}</div>

                    <h3>My daily progress journal <span style={{ fontSize: 11, opacity: 0.6 }}>(local only — feeds your standup)</span></h3>
                    <p className="help-text">
                        Jot down what you did on this work item today. Each entry is timestamped and stays on your machine.
                        The standup generator uses these as the <strong>primary source</strong> for your &ldquo;Yesterday&rdquo; section.
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <input
                            type="checkbox"
                            checked={!!note?.done}
                            onChange={(e) => void toggleNoteDone(id, e.target.checked)}
                            id={`note-done-${id}`}
                        />
                        <label htmlFor={`note-done-${id}`} style={{ fontSize: 12 }}>
                            {note?.done ? 'Marked done in my local todo list' : 'Mark as done in my todo list'}
                        </label>
                    </div>
                    <textarea
                        rows={3}
                        style={{ width: '100%' }}
                        placeholder="What did you do on this item today? (Ctrl+Enter to add)"
                        value={journalDraft}
                        onChange={(e) => setJournalDraft(e.target.value)}
                        onKeyDown={(e) => {
                            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                                e.preventDefault();
                                void submitJournal();
                            }
                        }}
                    />
                    <button disabled={!journalDraft.trim()} onClick={() => void submitJournal()}>Add journal entry</button>

                    {sortedEntries.length > 0 && (
                        <ul className="note-timeline">
                            {sortedEntries.map((e) => (
                                <li key={e.ts} className="note-entry">
                                    <div className="note-entry-meta">
                                        <span>{formatTs(e.ts)}</span>
                                        <button
                                            type="button"
                                            className="note-entry-delete"
                                            title="Delete entry"
                                            onClick={() => void deleteNoteEntry(id, e.ts)}
                                        >
                                            ✕
                                        </button>
                                    </div>
                                    <div className="note-entry-text">{e.text}</div>
                                </li>
                            ))}
                        </ul>
                    )}

                    <h3>Description</h3>
                    <div dangerouslySetInnerHTML={{ __html: desc }} />
                    <h3>Change state</h3>
                    <input type="text" placeholder="New state e.g. Active" value={newState} onChange={(e) => setNewState(e.target.value)} />
                    <button disabled={!newState} onClick={async () => { await updateState(id, newState); setNewState(''); }}>Update</button>
                    <h3>Add comment <span style={{ fontSize: 11, opacity: 0.6 }}>(posted to ADO)</span></h3>
                    <textarea rows={4} style={{ width: '100%' }} value={comment} onChange={(e) => setComment(e.target.value)} />
                    <button
                        disabled={!comment.trim()}
                        onClick={async () => { await call('workItems.addComment', { id, text: comment.trim() }); setComment(''); }}
                    >Post comment</button>
                </>
            )}
        </div>
    );
};

function formatTs(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString();
}
