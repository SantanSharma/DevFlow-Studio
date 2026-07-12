import type { WorkItem } from "../rpc/schema";
import type { LmClient } from "./lm-client";
import { isCompletedState } from "../util/completed-states";
import {
  getWorkflowCategories,
  categoryStateSet,
  normalizeState,
} from "../util/workflow-categories";

export type TimeRange = "weekly" | "monthly" | "half-yearly" | "yearly";

export interface RangeSummary {
  completedCount: number;
  completedPoints: number;
  plannedCount: number;
  plannedPoints: number;
  activeCount: number;
  blockedCount: number;
  // Item ids backing each count, so the webview can open the universal
  // work items drawer with the exact underlying items.
  completedIds: number[];
  plannedIds: number[];
  activeIds: number[];
  blockedIds: number[];
}

interface DashboardMetrics {
  storyPointsByMonth: { month: string; points: number; itemIds: number[] }[];
  velocity: { period: string; points: number; itemIds: number[] }[];
  completedCount: number;
  plannedCount: number;
  completedPoints: number;
  plannedPoints: number;
  focusItems: WorkItem[];
  currentSprint?: string;
  activeCount: number;
  blockedCount: number;
  summaryByRange: Record<TimeRange, RangeSummary>;
}

const TIME_RANGE_DAYS: Record<TimeRange, number> = {
  weekly: 7,
  monthly: 30,
  "half-yearly": 180,
  yearly: 365,
};

const TIME_RANGES = Object.keys(TIME_RANGE_DAYS) as TimeRange[];

interface DashboardFilters {
  dateRange: "current-sprint" | "last-30-days" | "last-90-days";
  workItemTypes: string[];
  states: string[];
}

export class DashboardService {
  constructor(private readonly _lm: LmClient) {}

  // Completed states come from the devflowStudio.completedStates setting
  // (case-insensitive) so orgs with custom workflows can define what counts
  // as done.
  private _isCompleted(state?: string): boolean {
    return isCompletedState(state);
  }

  private _getEffectiveClosedDate(item: WorkItem): string | undefined {
    // Strictly use closedDate (Microsoft.VSTS.Common.ClosedDate). changedDate
    // is NOT a valid fallback: it moves whenever any field changes (comments,
    // tags), which would shift completed points to the wrong month.
    return item.closedDate;
  }

  public async calculateMetrics(
    items: WorkItem[],
    filters: DashboardFilters,
  ): Promise<DashboardMetrics> {
    // Apply date range filtering
    const filteredItems = this._applyDateRangeFilter(items, filters.dateRange);

    // Calculate story points by month for the last 12 months
    const storyPointsByMonth = this._calculateStoryPointsByMonth(items);

    // Calculate velocity (last 6 sprints or 4 weeks)
    const velocity = this._calculateVelocity(items);

    // Get current sprint items
    const currentSprint = this._getCurrentSprint(items);

    // Calculate completed vs planned using filtered items (all active/in-progress)
    const { completedCount, plannedCount, completedPoints, plannedPoints } =
      this._calculateCompletedVsPlanned(filteredItems);

    // Get focus items for today - use ALL items, not filtered by date range
    // This ensures we see all active work items regardless of sprint
    const focusItems = this._getFocusItems(items);

    // Calculate active and blocked counts from the configured workflow
    // categories (devflowStudio.workflowCategories) instead of hardcoded names.
    const categories = getWorkflowCategories();
    const activeStates = categoryStateSet(categories, ["inDev"]);
    const activeCount = items.filter((item) =>
      activeStates.has(normalizeState(item.state)),
    ).length;
    const blockedCount = items.filter((item) =>
      this._isBlocked(item, categoryStateSet(categories, ["blocked"])),
    ).length;

    // Pre-compute summaries for every supported time range so the webview can
    // switch filters instantly without extra RPC round-trips.
    const summaryByRange = Object.fromEntries(
      TIME_RANGES.map((range) => [range, this._summarizeRange(items, range)]),
    ) as Record<TimeRange, RangeSummary>;

    return {
      storyPointsByMonth,
      velocity,
      completedCount,
      plannedCount,
      completedPoints,
      plannedPoints,
      focusItems,
      currentSprint,
      activeCount,
      blockedCount,
      summaryByRange,
    };
  }

  /** Blocked = state in the blocked category, or blocking signalled by state/tag text. */
  private _isBlocked(item: WorkItem, blockedStates: Set<string>): boolean {
    return (
      blockedStates.has(normalizeState(item.state)) ||
      item.state.toLowerCase().includes("block") ||
      item.tags.some((t) => t.toLowerCase().includes("block"))
    );
  }

  /**
   * Summarizes activity for a time range:
   * - Completed: items in a configured completed state (devflowStudio.completedStates)
   *   with a real closedDate inside the range. closedDate is revision-resolved
   *   upstream for custom states, so this respects the configured states end-to-end.
   * - Planned: items touched (changed/created) inside the range, excluding removed ones.
   * - Active/Blocked: current-state counts among items touched inside the range,
   *   using the configured workflow categories.
   */
  private _summarizeRange(items: WorkItem[], range: TimeRange): RangeSummary {
    const cutoff = Date.now() - TIME_RANGE_DAYS[range] * 24 * 60 * 60 * 1000;
    const inRange = (iso?: string): boolean =>
      !!iso && new Date(iso).getTime() >= cutoff;

    const categories = getWorkflowCategories();
    const activeStates = categoryStateSet(categories, ["inDev"]);
    const blockedStates = categoryStateSet(categories, ["blocked"]);

    const completed = items.filter(
      (item) => this._isCompleted(item.state) && inRange(item.closedDate),
    );
    const touched = items.filter(
      (item) =>
        inRange(item.changedDate ?? item.createdDate) ||
        inRange(item.closedDate),
    );
    const planned = touched.filter(
      (item) => item.state !== "Removed" && item.state !== "Deleted",
    );
    const active = touched.filter((item) =>
      activeStates.has(normalizeState(item.state)),
    );
    const blocked = touched.filter((item) =>
      this._isBlocked(item, blockedStates),
    );

    const sumPoints = (list: WorkItem[]): number =>
      list.reduce((sum, item) => sum + (item.storyPoints || 0), 0);
    const ids = (list: WorkItem[]): number[] => list.map((item) => item.id);

    return {
      completedCount: completed.length,
      completedPoints: sumPoints(completed),
      plannedCount: planned.length,
      plannedPoints: sumPoints(planned),
      activeCount: active.length,
      blockedCount: blocked.length,
      completedIds: ids(completed),
      plannedIds: ids(planned),
      activeIds: ids(active),
      blockedIds: ids(blocked),
    };
  }

  public async generateInsights(metrics: DashboardMetrics): Promise<string> {
    const formats = [
      "numbered list",
      "bullet points",
      "paragraph",
      "comparison",
      "data-driven",
      "action-focused",
    ];
    const format = formats[Math.floor(Math.random() * formats.length)];
    const recentVelocity =
      metrics.velocity.length > 0
        ? metrics.velocity[metrics.velocity.length - 1].points
        : 0;

    // Token-optimized prompt (~50 tokens vs ~200 for the previous verbose
    // version): only the essential metric summary plus tight constraints.
    const prompt = `Dev productivity insights (${format}, 60-100 words):
Done: ${metrics.completedCount}/${metrics.plannedCount} items (${metrics.completedPoints}/${metrics.plannedPoints}pts)
Blocked: ${metrics.blockedCount} | Velocity: ${recentVelocity}pts/wk
Give 2-4 specific, actionable observations from this data. No generic advice.`;

    let insights = "";
    await this._lm.generate(
      prompt,
      {
        onToken: (text) => {
          insights += text;
        },
      },
      undefined,
    );

    return insights.trim();
  }

  private _calculateStoryPointsByMonth(
    items: WorkItem[],
  ): { month: string; points: number; itemIds: number[] }[] {
    const now = new Date();
    const monthsData: { month: string; points: number; itemIds: number[] }[] =
      [];

    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthLabel = date.toLocaleDateString("en-US", {
        month: "short",
        year: "2-digit",
      });

      // Compare local year/month of the closed date against the bucket.
      // Never derive the bucket key via toISOString(): local midnight on the
      // 1st converts to the previous month in UTC+ timezones, which shifted
      // every bucket back a month and dropped current-month closures entirely.
      const closedInMonth = items.filter((item) => {
        const effectiveClosedDate = this._getEffectiveClosedDate(item);
        if (!effectiveClosedDate) return false;
        const closed = new Date(effectiveClosedDate);
        return (
          closed.getFullYear() === date.getFullYear() &&
          closed.getMonth() === date.getMonth()
        );
      });
      const points = closedInMonth.reduce(
        (sum, item) => sum + (item.storyPoints || 0),
        0,
      );

      // itemIds includes 0-point completions too: the drawer answers "what did
      // I complete this month", and hiding pointless items would make counts
      // look wrong versus ADO.
      monthsData.push({
        month: monthLabel,
        points,
        itemIds: closedInMonth.map((item) => item.id),
      });
    }

    return monthsData;
  }

  private _calculateVelocity(
    items: WorkItem[],
  ): { period: string; points: number; itemIds: number[] }[] {
    // Calculate velocity for last 4 weeks
    const weeks: { period: string; points: number; itemIds: number[] }[] = [];
    const now = new Date();

    for (let i = 3; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - (i + 1) * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      const closedInWeek = items.filter((item) => {
        const effectiveClosedDate = this._getEffectiveClosedDate(item);
        if (!effectiveClosedDate) return false;
        const closed = new Date(effectiveClosedDate);
        return closed >= weekStart && closed < weekEnd;
      });
      const points = closedInWeek.reduce(
        (sum, item) => sum + (item.storyPoints || 0),
        0,
      );

      weeks.push({
        period: `W${i + 1}`,
        points,
        itemIds: closedInWeek.map((item) => item.id),
      });
    }

    return weeks;
  }

  private _getCurrentSprint(items: WorkItem[]): string | undefined {
    // Find the most common iteration path that looks like a current sprint
    const iterationCounts = new Map<string, number>();
    items.forEach((item) => {
      if (item.iterationPath && !this._isCompleted(item.state)) {
        iterationCounts.set(
          item.iterationPath,
          (iterationCounts.get(item.iterationPath) || 0) + 1,
        );
      }
    });

    let maxCount = 0;
    let currentSprint: string | undefined;
    iterationCounts.forEach((count, path) => {
      if (count > maxCount) {
        maxCount = count;
        currentSprint = path;
      }
    });

    return currentSprint;
  }

  private _calculateCompletedVsPlanned(items: WorkItem[]): {
    completedCount: number;
    plannedCount: number;
    completedPoints: number;
    plannedPoints: number;
  } {
    const plannedCount = items.length;
    const completedCount = items.filter((item) =>
      this._isCompleted(item.state),
    ).length;

    const plannedPoints = items.reduce(
      (sum, item) => sum + (item.storyPoints || 0),
      0,
    );
    const completedPoints = items
      .filter((item) => this._isCompleted(item.state))
      .reduce((sum, item) => sum + (item.storyPoints || 0), 0);

    return { completedCount, plannedCount, completedPoints, plannedPoints };
  }

  private _getFocusItems(items: WorkItem[]): WorkItem[] {
    // Get all active items: exclude the configured "completed" workflow
    // category plus removed/deleted. With default settings this matches the
    // previous hardcoded list exactly.
    const resolvedStates = categoryStateSet(getWorkflowCategories(), [
      "completed",
    ]);
    resolvedStates.add("removed");
    resolvedStates.add("deleted");

    return items
      .filter((item) => !resolvedStates.has(normalizeState(item.state)))
      .sort((a, b) => {
        // Sort by priority first, then by changed date
        const priorityDiff = (a.priority || 999) - (b.priority || 999);
        if (priorityDiff !== 0) return priorityDiff;

        const dateA = a.changedDate ? new Date(a.changedDate).getTime() : 0;
        const dateB = b.changedDate ? new Date(b.changedDate).getTime() : 0;
        return dateB - dateA;
      });
  }

  private _applyDateRangeFilter(
    items: WorkItem[],
    dateRange: "current-sprint" | "last-30-days" | "last-90-days",
  ): WorkItem[] {
    const now = new Date();
    const currentSprint = this._getCurrentSprint(items);

    switch (dateRange) {
      case "current-sprint":
        // If we have a current sprint, use it; otherwise fall back to last 30 days
        if (currentSprint) {
          return items.filter((item) => item.iterationPath === currentSprint);
        }
      // Fall through to last-30-days if no sprint detected
      case "last-30-days": {
        const thirtyDaysAgo = new Date(now);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return items.filter((item) => {
          if (!item.changedDate && !item.createdDate) return true; // Include if no date
          const itemDate = new Date(item.changedDate || item.createdDate!);
          return itemDate >= thirtyDaysAgo;
        });
      }
      case "last-90-days": {
        const ninetyDaysAgo = new Date(now);
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
        return items.filter((item) => {
          if (!item.changedDate && !item.createdDate) return true; // Include if no date
          const itemDate = new Date(item.changedDate || item.createdDate!);
          return itemDate >= ninetyDaysAgo;
        });
      }
      default:
        return items;
    }
  }
}
