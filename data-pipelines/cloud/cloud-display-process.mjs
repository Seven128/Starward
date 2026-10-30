import { tsImport } from "tsx/esm/api";

// Fixed local offline entry. It never constructs OutboxWorkerRuntime, starts
// an API, reads credentials or discovers a current publication.
let session = null, busy = false;
let sampledPeakRssBytes = process.memoryUsage().rss;
const sample = () => { sampledPeakRssBytes = Math.max(sampledPeakRssBytes, process.memoryUsage().rss); };
const timer = setInterval(sample, 50);
const send = message => new Promise((resolve, reject) => {
  if (!process.connected) { reject(Error("cloud_display_parent_disconnected")); return; }
  process.send(message, error => error ? reject(error) : resolve());
});
const fail = async error => {
  const code = /^cloud_(?:display|publication)_[a-z0-9_]+$/u.test(error?.message ?? "")
    ? error.message : "cloud_display_worker_failed";
  try { await send({ type: "failed", code }); } finally {
    clearInterval(timer); await session?.close();
    if (process.connected) process.disconnect();
    process.exitCode = 1;
  }
};
process.on("message", async message => {
  try {
    if (message?.type === "init" && !session && !busy) {
      busy = true;
      const { CloudDisplayRenderSession } = await tsImport("./prepare_tcc_display.mts", import.meta.url);
      session = await CloudDisplayRenderSession.open(message.source);
      busy = false; await send({ type: "ready" }); return;
    }
    if (message?.type === "render" && session && !busy && Number.isSafeInteger(message.id)) {
      busy = true;
      const result = await session.render(message.window, message.selectedAt);
      sampledPeakRssBytes = Math.max(sampledPeakRssBytes, result.sampledPeakRssBytes);
      busy = false;
      await send({ type: "rendered", id: message.id, result });
      return;
    }
    if (message?.type === "close" && session && !busy) {
      busy = true; await session.close(); sample(); clearInterval(timer);
      const used = process.cpuUsage();
      await send({ type: "closed", metrics: { cpuSeconds: (used.user + used.system) / 1e6, sampledPeakRssBytes } });
      process.disconnect(); return;
    }
    throw Error("cloud_display_worker_protocol_invalid");
  } catch (error) { await fail(error); }
});
process.once("disconnect", () => {
  clearInterval(timer);
  // Parent disappearance retires this exact process. It must not wait for an
  // unowned next job or remain as a daemon after its IPC owner has gone.
  void session?.close().finally(() => { process.exitCode ??= 0; });
});
