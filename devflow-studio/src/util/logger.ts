import * as vscode from "vscode";

export class Logger {
  private readonly _channel: vscode.OutputChannel;

  constructor(name: string) {
    this._channel = vscode.window.createOutputChannel(name);
  }

  public info(message: string, ...args: unknown[]): void {
    this._write("INFO", message, args);
  }

  public warn(message: string, ...args: unknown[]): void {
    this._write("WARN", message, args);
  }

  public error(message: string, ...args: unknown[]): void {
    this._write("ERROR", message, args);
  }

  public dispose(): void {
    this._channel.dispose();
  }

  private _write(level: string, message: string, args: unknown[]): void {
    const ts = new Date().toISOString();
    const extra = args.length
      ? " " + args.map((a) => this._fmt(a)).join(" ")
      : "";
    this._channel.appendLine(`[${ts}] ${level} ${message}${extra}`);
  }

  private _fmt(v: unknown): string {
    if (v instanceof Error) {
      return `${v.message}\n${v.stack ?? ""}`;
    }
    try {
      return typeof v === "string" ? v : JSON.stringify(v);
    } catch {
      return String(v);
    }
  }
}

export const logger = new Logger("DevFlow Studio");
