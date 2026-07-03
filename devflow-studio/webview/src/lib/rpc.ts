declare const acquireVsCodeApi: () => {
  postMessage: (msg: unknown) => void;
  setState: (state: unknown) => void;
  getState: () => unknown;
};

type Pending = { resolve: (v: unknown) => void; reject: (e: Error) => void };

const vscode = acquireVsCodeApi();
const pending = new Map<string, Pending>();
const eventListeners: Array<(event: string, data: unknown) => void> = [];

window.addEventListener("message", (e) => {
  const msg = e.data;
  if (msg && typeof msg.id === "string") {
    const p = pending.get(msg.id);
    if (!p) {
      return;
    }
    pending.delete(msg.id);
    if (msg.ok) {
      p.resolve(msg.result);
    } else {
      p.reject(new Error(msg.error ?? "RPC error"));
    }
  } else if (msg && typeof msg.event === "string") {
    for (const l of eventListeners) {
      l(msg.event, msg.data);
    }
  }
});

export function call<T = unknown>(
  method: string,
  params?: unknown,
): Promise<T> {
  const id = Math.random().toString(36).slice(2);
  return new Promise<T>((resolve, reject) => {
    pending.set(id, { resolve: resolve as (v: unknown) => void, reject });
    vscode.postMessage({ id, method, params });
  });
}

export function onEvent(
  listener: (event: string, data: unknown) => void,
): () => void {
  eventListeners.push(listener);
  return () => {
    const i = eventListeners.indexOf(listener);
    if (i >= 0) {
      eventListeners.splice(i, 1);
    }
  };
}
