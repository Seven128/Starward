export interface SkyImageFileSystem {
  readdir(options: {
    dirPath: string;
    success(result: { files: string[] }): void;
    fail(): void;
  }): void;
  unlink(options: { filePath: string; success(): void; fail(): void }): void;
}

export type SkyImageFileCleanup =
  | { status: "complete" | "partial"; matched: number; removed: number; failed: number }
  | { status: "unavailable" };

// Only these two native request owners create files in this namespace. Older
// deep-sky clients also used the unsuffixed name before per-request ownership.
const ARTWORK_FILE = /^sky-art-([a-z0-9]+(?:_[a-z0-9]+)?)-[1-9]\d*\.(?:png|jpg)$/;
const DEEP_SKY_FILE = /^deep-sky-M-(?:[1-9]|[1-9]\d|10\d|110)-(?:OVERVIEW|MEDIUM|DETAIL)(?:-([a-z0-9]+(?:_[a-z0-9]+)?)-[1-9]\d*)?\.(?:jpg|png)$/;

/** Encoded files belong to one JS runtime, independent of Canvas generations.
 * Live owners still release their own files; launch retires only old runtimes. */
export function createSkyImageFileSession(
  sessionId = `${Date.now().toString(36)}_${Math.floor(Math.random() * 0x1_0000_0000).toString(36)}`,
) {
  if (!/^[a-z0-9]+(?:_[a-z0-9]+)?$/.test(sessionId)) throw new Error("Invalid sky image file session");
  let sequence = 0;
  let cleanup: Promise<SkyImageFileCleanup> | undefined;

  const previousFile = (name: string) => {
    const match = ARTWORK_FILE.exec(name) ?? DEEP_SKY_FILE.exec(name);
    return match !== null && match[1] !== sessionId;
  };

  async function removePrevious(fs: SkyImageFileSystem, userDataPath: string | undefined): Promise<SkyImageFileCleanup> {
    if (typeof userDataPath !== "string") return { status: "unavailable" };
    const root = userDataPath.replace(/\/+$/, "");
    if (!root) return { status: "unavailable" };
    const files = await new Promise<string[] | null>((resolve) => {
      try {
        fs.readdir({ dirPath: root,
          success: result => resolve(Array.isArray(result.files) ? result.files : null),
          fail: () => resolve(null) });
      } catch { resolve(null); }
    });
    if (files === null) return { status: "unavailable" };
    const previous = [...new Set(files)].filter(name => typeof name === "string" && previousFile(name));
    let removed = 0;
    // Sequential native I/O; no scan or retry in rendering or pose updates.
    for (const name of previous) {
      const success = await new Promise<boolean>((resolve) => {
        try { fs.unlink({ filePath: `${root}/${name}`, success: () => resolve(true), fail: () => resolve(false) }); }
        catch { resolve(false); }
      });
      if (success) removed++;
    }
    const failed = previous.length - removed;
    return { status: failed ? "partial" : "complete", matched: previous.length, removed, failed };
  }

  return {
    nextRequestSuffix: () => `${sessionId}-${++sequence}`,
    removePreviousFiles(fs: SkyImageFileSystem, userDataPath: string | undefined): Promise<SkyImageFileCleanup> {
      // A slow launch scan may overlap current requests. Their shared session
      // is preserved even if their names enter the directory listing mid-scan.
      return cleanup ??= removePrevious(fs, userDataPath);
    },
  };
}

export const skyImageFileSession = createSkyImageFileSession();
