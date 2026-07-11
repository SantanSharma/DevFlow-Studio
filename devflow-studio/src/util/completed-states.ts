import * as vscode from "vscode";

const DEFAULT_COMPLETED_STATES = [
  "Closed",
  "Resolved",
  "Done",
  "Dev Complete",
  "Dev and QA Closed",
  "In QA",
  "Ready for QA",
  "Ready for Test",
];

/** Lowercased set of states treated as completed, from user settings. */
export function getCompletedStates(): Set<string> {
  const configured =
    vscode.workspace
      .getConfiguration()
      .get<string[]>("devflowStudio.completedStates") ??
    DEFAULT_COMPLETED_STATES;
  const list = configured.filter(
    (s) => typeof s === "string" && s.trim().length > 0,
  );
  return new Set(
    (list.length > 0 ? list : DEFAULT_COMPLETED_STATES).map((s) =>
      s.toLowerCase().trim(),
    ),
  );
}

export function isCompletedState(state?: string): boolean {
  if (!state) return false;
  return getCompletedStates().has(state.toLowerCase().trim());
}
