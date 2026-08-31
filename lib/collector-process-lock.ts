import { constants } from "node:fs";
import { open, readFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

export const DEFAULT_COLLECTOR_LOCK_PATH = join(tmpdir(), "noc-dashboard-monitoring-collector.lock");

export interface CollectorProcessLock {
  path: string;
  release(): Promise<void>;
}

function processExists(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
}

async function lockOwnerIsAlive(path: string): Promise<boolean> {
  try {
    const parsed = JSON.parse(await readFile(path, "utf8")) as { pid?: unknown };
    return Number.isInteger(parsed.pid) && (parsed.pid as number) > 0 && processExists(parsed.pid as number);
  } catch {
    return false;
  }
}

export async function acquireCollectorProcessLock(
  path = DEFAULT_COLLECTOR_LOCK_PATH,
): Promise<CollectorProcessLock | null> {
  const token = randomUUID();
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const handle = await open(path, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY, 0o600);
      await handle.writeFile(JSON.stringify({ pid: process.pid, token, createdAt: new Date().toISOString() }));
      await handle.close();
      return {
        path,
        async release() {
          try {
            const current = JSON.parse(await readFile(path, "utf8")) as { token?: unknown };
            if (current.token === token) await unlink(path);
          } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
          }
        },
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      if (await lockOwnerIsAlive(path)) return null;
      try {
        await unlink(path);
      } catch (unlinkError) {
        if ((unlinkError as NodeJS.ErrnoException).code !== "ENOENT") return null;
      }
    }
  }
  return null;
}

