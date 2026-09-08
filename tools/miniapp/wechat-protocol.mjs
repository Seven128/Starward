import { createHash } from "node:crypto";

const sha256 = value => createHash("sha256").update(value).digest("hex");

// Shared by the cold collector and warm observer. A timed-out connection cannot
// deliver a later success or replay a state-changing command on another socket.
export function boundWechatProtocol(program, timeoutMs = 20_000) {
  const connection = program?.connection;
  if (!connection || typeof connection.send !== "function" || typeof connection.dispose !== "function")
    throw new Error("wechat_protocol_connection_shape_unsupported");
  const send = connection.send.bind(connection);
  const pending = new Set();
  let failure;
  connection.send = (method, params) => {
    if (failure) return Promise.reject(failure);
    return new Promise((resolve, reject) => {
      let settled = false;
      const finish = (ok, value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        pending.delete(finish);
        if (ok) resolve(value);
        else reject(value);
      };
      const timer = setTimeout(() => {
        failure = new Error(`wechat_protocol_request_deadline:${sha256(String(method))}`);
        for (const settle of [...pending]) settle(false, failure);
        try { connection.dispose(); } catch {}
      }, timeoutMs);
      pending.add(finish);
      Promise.resolve().then(() => send(method, params)).then(
        value => finish(true, value), error => finish(false, error),
      );
    });
  };
  return program;
}

export async function boundedWechatConnect(connect, timeoutMs) {
  let expired = false;
  let timer;
  try {
    return await Promise.race([
      Promise.resolve().then(connect).then(program => {
        if (expired) {
          try { program.disconnect(); } catch {}
          throw new Error("wechat_connection_arrived_after_deadline");
        }
        return program;
      }),
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          expired = true;
          reject(new Error("wechat_connection_establishment_deadline"));
        }, timeoutMs);
      }),
    ]);
  } finally { clearTimeout(timer); }
}
