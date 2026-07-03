import * as vscode from "vscode";
import { logger } from "../util/logger";

export interface LmStreamHandler {
  onToken: (text: string) => void;
}

export class LmClient {
  public async generate(
    prompt: string,
    handler: LmStreamHandler,
    token?: vscode.CancellationToken,
  ): Promise<string> {
    const model = await this._pickModel();
    if (!model) {
      throw new Error(
        "No Claude language model is available via VS Code. Sign in to Copilot and ensure a Claude model is enabled.",
      );
    }
    const messages = [vscode.LanguageModelChatMessage.User(prompt)];
    const ct = token ?? new vscode.CancellationTokenSource().token;
    const response = await model.sendRequest(messages, {}, ct);
    let full = "";
    for await (const chunk of response.text) {
      full += chunk;
      handler.onToken(chunk);
    }
    return full;
  }

  private async _pickModel(): Promise<vscode.LanguageModelChat | undefined> {
    try {
      const claude = await vscode.lm.selectChatModels({
        vendor: "copilot",
        family: "claude-3.5-sonnet",
      });
      if (claude.length > 0) {
        return claude[0];
      }
    } catch (e) {
      logger.warn("selectChatModels(claude-3.5-sonnet) failed", e);
    }
    try {
      const any = await vscode.lm.selectChatModels({ vendor: "copilot" });
      const claude = any.find((m) => m.family.toLowerCase().includes("claude"));
      return claude ?? any[0];
    } catch (e) {
      logger.error("selectChatModels failed", e);
      return undefined;
    }
  }
}
