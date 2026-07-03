import * as vscode from "vscode";

const KEY = "devflowStudio.notes.v2";
const LEGACY_KEY = "adoDashboard.notes.v1";

export interface NoteEntry {
  ts: string;
  text: string;
}

export interface NoteRecord {
  entries: NoteEntry[];
  done: boolean;
  updatedAt: string;
}

export type NotesMap = Record<string, NoteRecord>;

interface LegacyNoteRecord {
  text?: string;
  done?: boolean;
  updatedAt?: string;
}

export class NotesService {
  constructor(private readonly _context: vscode.ExtensionContext) {
    this._migrateLegacy();
  }

  public list(): NotesMap {
    return this._context.globalState.get<NotesMap>(KEY) ?? {};
  }

  public get(id: number): NoteRecord | undefined {
    return this.list()[String(id)];
  }

  public async appendEntry(id: number, text: string): Promise<NoteRecord> {
    const trimmed = text.trim();
    if (!trimmed) {
      return this._ensure(id);
    }
    const all = this.list();
    const existing = all[String(id)];
    const entry: NoteEntry = { ts: new Date().toISOString(), text: trimmed };
    const next: NoteRecord = {
      entries: [...(existing?.entries ?? []), entry],
      done: existing?.done ?? false,
      updatedAt: entry.ts,
    };
    all[String(id)] = next;
    await this._context.globalState.update(KEY, all);
    return next;
  }

  public async deleteEntry(id: number, ts: string): Promise<NoteRecord> {
    const all = this.list();
    const existing = all[String(id)];
    if (!existing) {
      return this._ensure(id);
    }
    const next: NoteRecord = {
      entries: existing.entries.filter((e) => e.ts !== ts),
      done: existing.done,
      updatedAt: new Date().toISOString(),
    };
    all[String(id)] = next;
    await this._context.globalState.update(KEY, all);
    return next;
  }

  public async toggleDone(id: number, done?: boolean): Promise<NoteRecord> {
    const all = this.list();
    const existing = all[String(id)] ?? {
      entries: [],
      done: false,
      updatedAt: new Date().toISOString(),
    };
    const next: NoteRecord = {
      entries: existing.entries,
      done: done ?? !existing.done,
      updatedAt: new Date().toISOString(),
    };
    all[String(id)] = next;
    await this._context.globalState.update(KEY, all);
    return next;
  }

  public async remove(id: number): Promise<void> {
    const all = this.list();
    delete all[String(id)];
    await this._context.globalState.update(KEY, all);
  }

  public getEntriesSince(sinceIso: string): Array<NoteEntry & { id: number }> {
    const all = this.list();
    const out: Array<NoteEntry & { id: number }> = [];
    for (const [idStr, rec] of Object.entries(all)) {
      const id = Number(idStr);
      for (const e of rec.entries) {
        if (e.ts >= sinceIso) {
          out.push({ id, ts: e.ts, text: e.text });
        }
      }
    }
    out.sort((a, b) => a.ts.localeCompare(b.ts));
    return out;
  }

  private _ensure(id: number): NoteRecord {
    const existing = this.get(id);
    if (existing) return existing;
    return { entries: [], done: false, updatedAt: new Date().toISOString() };
  }

  private _migrateLegacy(): void {
    const current = this._context.globalState.get<NotesMap>(KEY);
    if (current) return;
    const legacy =
      this._context.globalState.get<Record<string, LegacyNoteRecord>>(
        LEGACY_KEY,
      );
    if (!legacy) return;
    const migrated: NotesMap = {};
    for (const [id, rec] of Object.entries(legacy)) {
      const text = (rec?.text ?? "").trim();
      const updatedAt = rec?.updatedAt ?? new Date().toISOString();
      migrated[id] = {
        entries: text ? [{ ts: updatedAt, text }] : [],
        done: rec?.done ?? false,
        updatedAt,
      };
    }
    void this._context.globalState.update(KEY, migrated);
  }
}
