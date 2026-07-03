import React, { useEffect, useRef, useState } from 'react';
import { call, onEvent } from '../lib/rpc';

interface StandupResult {
    markdown: string;
    context: { windowHours: number; commentCount: number; stateChangeCount: number; blockedCount: number; plannedCount: number };
}

export const StandupPanel: React.FC = () => {
    const [busy, setBusy] = useState(false);
    const [stage, setStage] = useState('');
    const [markdown, setMarkdown] = useState('');
    const [stats, setStats] = useState<StandupResult['context'] | undefined>();
    const [error, setError] = useState<string | undefined>();
    const [hours, setHours] = useState(24);
    const streamingRef = useRef('');

    useEffect(() => {
        return onEvent((event, data) => {
            if (event === 'standup.progress') {
                setStage((data as { stage: string }).stage);
            } else if (event === 'standup.token') {
                streamingRef.current += (data as { text: string }).text;
                setMarkdown(streamingRef.current);
            }
        });
    }, []);

    const generate = async (): Promise<void> => {
        setBusy(true);
        setError(undefined);
        setStage('Starting…');
        setMarkdown('');
        streamingRef.current = '';
        try {
            const res = await call<StandupResult>('standup.generate', { windowHours: hours });
            setMarkdown(res.markdown);
            setStats(res.context);
            setStage('Done');
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
            setStage('');
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="standup-panel">
            <h2 style={{ marginTop: 0 }}>Daily Standup</h2>
            <p style={{ opacity: 0.8 }}>Collects your comments, state changes, blockers, and current-sprint items, then asks Claude (via VS Code Language Model API) to draft your standup.</p>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
                <label>Window:&nbsp;
                    <input type="number" min={1} max={168} value={hours} onChange={(e) => setHours(Math.max(1, Number(e.target.value) || 24))} style={{ width: 60 }} />
                    &nbsp;hours
                </label>
                <button onClick={generate} disabled={busy}>{busy ? 'Generating…' : 'Generate'}</button>
                {markdown && !busy && (
                    <button className="secondary" onClick={() => { void navigator.clipboard.writeText(markdown); }}>Copy</button>
                )}
            </div>
            {stage && <div className="progress">{stage}</div>}
            {error && <div className="error">{error}</div>}
            {stats && (
                <div style={{ fontSize: 11, opacity: 0.7, margin: '6px 0 12px' }}>
                    {stats.commentCount} comments · {stats.stateChangeCount} state changes · {stats.blockedCount} blocked · {stats.plannedCount} planned · last {stats.windowHours}h
                </div>
            )}
            {markdown && <pre>{markdown}</pre>}
        </div>
    );
};
