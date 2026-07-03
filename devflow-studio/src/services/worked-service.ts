import * as vscode from "vscode";
import type { WorkItem } from "../rpc/schema";

const KEY = "devflowStudio.worked.v1";

export interface WorkedRecord {
  snapshot: WorkItem;
  pinnedAt: string;
}

export type WorkedMap = Record<string, WorkedRecord>;

export class WorkedService {
  constructor(private readonly _context: vscode.ExtensionContext) {}

  public list(): WorkedMap {
    return this._context.globalState.get<WorkedMap>(KEY) ?? {};
  }

  public async add(item: WorkItem): Promise<WorkedMap> {
    const all = this.list();
    all[String(item.id)] = {
      snapshot: item,
      pinnedAt: all[String(item.id)]?.pinnedAt ?? new Date().toISOString(),
    };
    await this._context.globalState.update(KEY, all);
    return all;
  }

  public async remove(id: number): Promise<WorkedMap> {
    const all = this.list();
    delete all[String(id)];
    await this._context.globalState.update(KEY, all);
    return all;
  }
}
