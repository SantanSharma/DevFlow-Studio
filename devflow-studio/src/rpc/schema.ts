import { z } from "zod";

export const WorkItemSchema = z.object({
  id: z.number(),
  rev: z.number().optional(),
  type: z.string(),
  state: z.string(),
  title: z.string(),
  iterationPath: z.string().optional(),
  areaPath: z.string().optional(),
  assignedTo: z.string().optional(),
  priority: z.number().optional(),
  storyPoints: z.number().optional(),
  tags: z.array(z.string()).default([]),
  changedDate: z.string().optional(),
  createdDate: z.string().optional(),
  closedDate: z.string().optional(),
  parentId: z.number().optional(),
  url: z.string().optional(),
});
export type WorkItem = z.infer<typeof WorkItemSchema>;

export const McpServerInfoSchema = z.object({
  id: z.string(),
  command: z.string(),
  args: z.array(z.string()).default([]),
  source: z.enum(["workspace", "user", "custom"]),
  connected: z.boolean(),
  toolCount: z.number().optional(),
  error: z.string().optional(),
});
export type McpServerInfo = z.infer<typeof McpServerInfoSchema>;

export const McpServerInputSchema = z.object({
  id: z.string().min(1),
  command: z.string().min(1),
  args: z.array(z.string()).default([]),
  env: z.record(z.string()).optional(),
});
export type McpServerInput = z.infer<typeof McpServerInputSchema>;

export const StandupResultSchema = z.object({
  markdown: z.string(),
  context: z.object({
    windowHours: z.number(),
    commentCount: z.number(),
    stateChangeCount: z.number(),
    blockedCount: z.number(),
    plannedCount: z.number(),
    commitCount: z.number(),
    prCount: z.number(),
    journalCount: z.number(),
  }),
});
export type StandupResult = z.infer<typeof StandupResultSchema>;

export const NoteEntrySchema = z.object({
  ts: z.string(),
  text: z.string(),
});
export type NoteEntry = z.infer<typeof NoteEntrySchema>;

export const NoteRecordSchema = z.object({
  entries: z.array(NoteEntrySchema).default([]),
  done: z.boolean(),
  updatedAt: z.string(),
});
export type NoteRecord = z.infer<typeof NoteRecordSchema>;

export const WorkedRecordSchema = z.object({
  snapshot: WorkItemSchema,
  pinnedAt: z.string(),
});
export type WorkedRecord = z.infer<typeof WorkedRecordSchema>;

export const RpcRequestSchema = z.discriminatedUnion("method", [
  z.object({
    id: z.string(),
    method: z.literal("workItems.list"),
    params: z.object({ refresh: z.boolean().optional() }).optional(),
  }),
  z.object({
    id: z.string(),
    method: z.literal("workItems.detail"),
    params: z.object({ id: z.number() }),
  }),
  z.object({
    id: z.string(),
    method: z.literal("workItems.updateState"),
    params: z.object({ id: z.number(), state: z.string() }),
  }),
  z.object({
    id: z.string(),
    method: z.literal("workItems.addComment"),
    params: z.object({ id: z.number(), text: z.string() }),
  }),
  z.object({
    id: z.string(),
    method: z.literal("mcp.listServers"),
    params: z.object({}).optional(),
  }),
  z.object({
    id: z.string(),
    method: z.literal("mcp.addServer"),
    params: McpServerInputSchema,
  }),
  z.object({
    id: z.string(),
    method: z.literal("mcp.removeServer"),
    params: z.object({ id: z.string() }),
  }),
  z.object({
    id: z.string(),
    method: z.literal("mcp.callTool"),
    params: z.object({
      serverId: z.string(),
      tool: z.string(),
      args: z.record(z.unknown()),
    }),
  }),
  z.object({
    id: z.string(),
    method: z.literal("standup.generate"),
    params: z.object({ windowHours: z.number().optional() }).optional(),
  }),
  z.object({
    id: z.string(),
    method: z.literal("settings.get"),
    params: z.object({}).optional(),
  }),
  z.object({
    id: z.string(),
    method: z.literal("settings.set"),
    params: z.object({ key: z.string(), value: z.any() }),
  }),
  z.object({
    id: z.string(),
    method: z.literal("notes.list"),
    params: z.object({}).optional(),
  }),
  z.object({
    id: z.string(),
    method: z.literal("notes.appendEntry"),
    params: z.object({ id: z.number(), text: z.string() }),
  }),
  z.object({
    id: z.string(),
    method: z.literal("notes.deleteEntry"),
    params: z.object({ id: z.number(), ts: z.string() }),
  }),
  z.object({
    id: z.string(),
    method: z.literal("notes.toggleDone"),
    params: z.object({ id: z.number(), done: z.boolean().optional() }),
  }),
  z.object({
    id: z.string(),
    method: z.literal("notes.remove"),
    params: z.object({ id: z.number() }),
  }),
  z.object({
    id: z.string(),
    method: z.literal("worked.list"),
    params: z.object({}).optional(),
  }),
  z.object({
    id: z.string(),
    method: z.literal("worked.add"),
    params: z.object({ item: WorkItemSchema }),
  }),
  z.object({
    id: z.string(),
    method: z.literal("worked.remove"),
    params: z.object({ id: z.number() }),
  }),
  z.object({
    id: z.string(),
    method: z.literal("onboarding.get"),
    params: z.object({}).optional(),
  }),
  z.object({
    id: z.string(),
    method: z.literal("onboarding.complete"),
    params: z.object({}).optional(),
  }),
  z.object({
    id: z.string(),
    method: z.literal("system.openExternal"),
    params: z.object({ url: z.string() }),
  }),
  z.object({
    id: z.string(),
    method: z.literal("diag.run"),
    params: z.object({}).optional(),
  }),
  z.object({
    id: z.string(),
    method: z.literal("dashboard.metrics"),
    params: z.object({}).optional(),
  }),
  z.object({
    id: z.string(),
    method: z.literal("ai.generateMotivation"),
    params: z.object({}).optional(),
  }),
  z.object({
    id: z.string(),
    method: z.literal("ai.generateInsights"),
    params: z.object({}).optional(),
  }),
  z.object({
    id: z.string(),
    method: z.literal("standup.history"),
    params: z.object({}).optional(),
  }),
  z.object({
    id: z.string(),
    method: z.literal("standup.delete"),
    params: z.object({ index: z.number() }),
  }),
  z.object({
    id: z.string(),
    method: z.literal("standup.current"),
    params: z.object({}).optional(),
  }),
  z.object({
    id: z.string(),
    method: z.literal("clipboard.write"),
    params: z.object({ text: z.string() }),
  }),
]);
export type RpcRequest = z.infer<typeof RpcRequestSchema>;

export type RpcResponse =
  | { id: string; ok: true; result: unknown }
  | { id: string; ok: false; error: string };

export type RpcEvent =
  | { event: "workItems.changed"; data: { count: number } }
  | { event: "standup.progress"; data: { stage: string } }
  | { event: "standup.token"; data: { text: string } }
  | { event: "standup.changed"; data: Record<string, never> };
