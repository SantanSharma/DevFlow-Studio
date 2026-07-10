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
    try {
      const model = await this._pickModel();
      if (!model) {
        logger.warn("No language model available for generation");
        throw new Error(
          "No language model is available. Please ensure GitHub Copilot is enabled.",
        );
      }

      logger.info(
        `Using model: ${model.vendor}/${model.family} (${model.name})`,
      );
      const messages = [vscode.LanguageModelChatMessage.User(prompt)];
      const ct = token ?? new vscode.CancellationTokenSource().token;
      const response = await model.sendRequest(messages, {}, ct);
      let full = "";
      for await (const chunk of response.text) {
        full += chunk;
        handler.onToken(chunk);
      }
      logger.info(`Generated ${full.length} characters`);
      return full;
    } catch (e) {
      logger.error("LmClient.generate failed", e);
      throw e;
    }
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
