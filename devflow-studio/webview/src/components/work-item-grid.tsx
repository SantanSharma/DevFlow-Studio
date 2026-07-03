import React from 'react';
import { useStore, type WorkItem } from '../state/store';

interface Props {
    items: WorkItem[];
    onSelect: (id: number) => void;
}

const stateClass = (s: string): string => s.replace(/[^A-Za-z]/g, '');

export const WorkItemGrid: React.FC<Props> = ({ items, onSelect }) => {
    const notes = useStore((s) => s.notes);
    return (
        <table className="wi-grid">
            <thead>
                <tr>
                    <th style={{ width: 70 }}>ID</th>
                    <th style={{ width: 110 }}>Type</th>
                    <th style={{ width: 130 }}>State</th>
                    <th>Title</th>
                    <th style={{ width: 220 }}>Iteration</th>
                    <th style={{ width: 60 }}>Pri</th>
                    <th style={{ width: 60 }}>Pts</th>
                    <th style={{ width: 130 }}>Changed</th>
                    <th style={{ width: 220 }}>Last journal note</th>
                </tr>
            </thead>
            <tbody>
                {items.map((i) => {
                    const rec = notes[String(i.id)];
                    const last = rec?.entries?.[rec.entries.length - 1];
                    return (
                        <tr key={i.id} onClick={() => onSelect(i.id)}>
                            <td>#{i.id}</td>
                            <td>{i.type}</td>
                            <td><span className={`state ${stateClass(i.state)}`}>{i.state}</span></td>
                            <td>{i.title}</td>
                            <td title={i.iterationPath}>{shortIteration(i.iterationPath)}</td>
                            <td>{i.priority ?? ''}</td>
                            <td>{i.storyPoints ?? ''}</td>
                            <td>{formatDate(i.changedDate)}</td>
                            <td title={last ? `${formatDate(last.ts)} — ${last.text}` : ''} style={{ fontSize: 11, opacity: 0.85 }}>
                                {last ? truncate(last.text, 60) : ''}
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );
};

function shortIteration(p?: string): string {
    if (!p) {
        return '';
    }
    const parts = p.split('\\');
    return parts.slice(-2).join(' / ');
}

function formatDate(s?: string): string {
    if (!s) {
        return '';
    }
    const d = new Date(s);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) {
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString();
}

function truncate(s: string, n: number): string {
    return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}
