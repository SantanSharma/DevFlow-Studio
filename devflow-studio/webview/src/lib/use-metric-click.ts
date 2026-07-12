import type { KeyboardEvent } from 'react';
import { useStore, type WorkItem } from '../state/store';

/**
 * Shared helper for clickable metrics. Returns a factory producing an onClick
 * handler that opens the universal work items drawer with the given list.
 *
 * Usage:
 *   const openMetric = useMetricClick();
 *   <span className="metric-clickable" onClick={openMetric('Blocked items', blocked, 'why...')} />
 */
export function useMetricClick(): (
    title: string,
    items: WorkItem[],
    sourceDescription?: string,
) => () => void {
    const openDrawer = useStore((s) => s.openWorkItemsDrawer);
    return (title, items, sourceDescription) => () =>
        openDrawer({ title, items, sourceDescription });
}

/** Keyboard handler making a clickable metric operable via Enter/Space. */
export function metricKeyHandler(
    activate: () => void,
): (e: KeyboardEvent) => void {
    return (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            activate();
        }
    };
}
