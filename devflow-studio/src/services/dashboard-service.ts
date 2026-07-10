import type { WorkItem } from "../rpc/schema";
import type { LmClient } from "./lm-client";
import { logger } from "../util/logger";

interface DashboardMetrics {
  storyPointsByMonth: { month: string; points: number }[];
  velocity: { period: string; points: number }[];
  completedCount: number;
  plannedCount: number;
  completedPoints: number;
  plannedPoints: number;
  agingItems: WorkItem[];
  focusItems: WorkItem[];
  currentSprint?: string;
  activeCount: number;
  blockedCount: number;
}

interface DashboardFilters {
  dateRange: "current-sprint" | "last-30-days" | "last-90-days";
  workItemTypes: string[];
  states: string[];
}

export class DashboardService {
  // Completed state names (case-insensitive)
  private readonly COMPLETED_STATES = [
    "closed",
    "resolved",
    "done",
    "dev complete",
  ];

  constructor(private readonly _lm: LmClient) {}

  private _isCompleted(state?: string): boolean {
    if (!state) return false;
    const normalized = state.toLowerCase().trim();
    return this.COMPLETED_STATES.includes(normalized);
  }

  private _getEffectiveClosedDate(item: WorkItem): string | undefined {
    // Use closedDate if available, otherwise use changedDate for completed items
    if (item.closedDate) return item.closedDate;
    if (this._isCompleted(item.state)) return item.changedDate;
    return undefined;
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

    // Find aging items (not changed in 7+ days and still active)
    const agingItems = this._findAgingItems(filteredItems);

    // Get focus items for today - use ALL items, not filtered by date range
    // This ensures we see all active work items regardless of sprint
    const focusItems = this._getFocusItems(items);

    // Calculate active and blocked counts
    const activeCount = items.filter(
      (item) =>
        item.state === "Active" ||
        item.state === "In Progress" ||
        item.state === "In Development",
    ).length;
    const blockedCount = items.filter(
      (item) =>
        item.state.toLowerCase().includes("block") ||
        item.tags.some((t) => t.toLowerCase().includes("block")),
    ).length;

    return {
      storyPointsByMonth,
      velocity,
      completedCount,
      plannedCount,
      completedPoints,
      plannedPoints,
      agingItems,
      focusItems,
      currentSprint,
      activeCount,
      blockedCount,
    };
  }

  public async generateMotivation(): Promise<string> {
    const styles = [
      "humor",
      "sarcasm",
      "inspiration",
      "challenge",
      "practical",
      "urgency",
    ];
    const style = styles[Math.floor(Math.random() * styles.length)];

    const prompt = `Generate a single, concise motivational sentence for a developer starting their day. 
Use a ${style} tone. Keep it under 25 words. Be specific and actionable, not generic. 
Avoid corporate language. Make it feel personal and direct.`;

    let motivation = "";
    await this._lm.generate(
      prompt,
      {
        onToken: (text) => {
          motivation += text;
        },
      },
      undefined,
    );

    return motivation.trim();
  }

  public async generateInsights(
    metrics: DashboardMetrics,
    recentItems: WorkItem[],
  ): Promise<string> {
    const formats = [
      "numbered list",
      "bullet points",
      "paragraph",
      "comparison",
      "data-driven",
      "action-focused",
    ];
    const format = formats[Math.floor(Math.random() * formats.length)];

    const prompt = `Analyze this developer's work data and provide 2-4 specific, actionable productivity insights.

Data:
- Completed: ${metrics.completedCount} items (${metrics.completedPoints} story points)
- Planned: ${metrics.plannedCount} items (${metrics.plannedPoints} story points)
- Aging items: ${metrics.agingItems.length}
- Recent velocity: ${metrics.velocity.length > 0 ? metrics.velocity[metrics.velocity.length - 1].points : 0} points

Format: Use a ${format} style.
Tone: Helpful and analytical, not judgmental.
Length: 60-150 words.
Focus: Specific observations about patterns, trends, and concrete recommendations.
Avoid: Generic advice. Be specific to this data.`;

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
  ): { month: string; points: number }[] {
    const now = new Date();
    const monthsData: { month: string; points: number }[] = [];

    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = date.toISOString().slice(0, 7); // YYYY-MM
      const monthLabel = date.toLocaleDateString("en-US", {
        month: "short",
        year: "2-digit",
      });

      const points = items
        .filter((item) => {
          const effectiveClosedDate = this._getEffectiveClosedDate(item);
          if (!effectiveClosedDate) return false;
          const closedMonth = effectiveClosedDate.slice(0, 7);
          return closedMonth === monthKey;
        })
        .reduce((sum, item) => sum + (item.storyPoints || 0), 0);

      monthsData.push({ month: monthLabel, points });
    }

    return monthsData;
  }

  private _calculateVelocity(
    items: WorkItem[],
  ): { period: string; points: number }[] {
    // Calculate velocity for last 4 weeks
    const weeks: { period: string; points: number }[] = [];
    const now = new Date();

    for (let i = 3; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - (i + 1) * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      const points = items
        .filter((item) => {
          const effectiveClosedDate = this._getEffectiveClosedDate(item);
          if (!effectiveClosedDate) return false;
          const closed = new Date(effectiveClosedDate);
          return closed >= weekStart && closed < weekEnd;
        })
        .reduce((sum, item) => sum + (item.storyPoints || 0), 0);

      weeks.push({ period: `W${i + 1}`, points });
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

  private _findAgingItems(items: WorkItem[]): WorkItem[] {
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    return items
      .filter((item) => {
        if (this._isCompleted(item.state)) return false;
        if (!item.changedDate) return false;
        const changed = new Date(item.changedDate);
        return changed < sevenDaysAgo;
      })
      .sort((a, b) => {
        const dateA = a.changedDate ? new Date(a.changedDate).getTime() : 0;
        const dateB = b.changedDate ? new Date(b.changedDate).getTime() : 0;
        return dateA - dateB;
      });
  }

  private _getFocusItems(items: WorkItem[]): WorkItem[] {
    // Get all active items (not completed, not resolved)
    const RESOLVED_STATES = new Set([
      "Closed",
      "Resolved",
      "Done",
      "Removed",
      "Dev Complete",
    ]);

    return items
      .filter((item) => !RESOLVED_STATES.has(item.state))
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
