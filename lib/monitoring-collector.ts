export const DEFAULT_COLLECTION_INTERVAL_SECONDS = 20;
export const MINIMUM_COLLECTION_INTERVAL_SECONDS = 5;

export function parseCollectionIntervalSeconds(value: string | undefined): number {
  if (value === undefined) return DEFAULT_COLLECTION_INTERVAL_SECONDS;

  const intervalSeconds = Number(value);
  if (!value.trim() || !Number.isFinite(intervalSeconds) || intervalSeconds <= 0) {
    throw new Error(
      "NOC_COLLECTION_INTERVAL_SECONDS must be a positive finite number of seconds",
    );
  }
  if (intervalSeconds < MINIMUM_COLLECTION_INTERVAL_SECONDS) {
    throw new Error(
      `NOC_COLLECTION_INTERVAL_SECONDS must be at least ${MINIMUM_COLLECTION_INTERVAL_SECONDS} seconds`,
    );
  }

  return intervalSeconds;
}

export interface CollectorLoopOptions<Result> {
  intervalMilliseconds: number;
  signal: AbortSignal;
  runCycle: () => Promise<Result>;
  wait?: (milliseconds: number, signal: AbortSignal) => Promise<boolean>;
  now?: () => number;
  onCycleStart?: () => void;
  onCycleComplete?: (result: Result, durationMilliseconds: number) => void;
  onCycleFailure?: (error: unknown, durationMilliseconds: number) => void;
}

export function waitForCollectorDelay(
  milliseconds: number,
  signal: AbortSignal,
): Promise<boolean> {
  if (signal.aborted) return Promise.resolve(false);

  return new Promise((resolve) => {
    const onAbort = () => {
      clearTimeout(timeout);
      resolve(false);
    };
    const timeout = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve(true);
    }, milliseconds);

    signal.addEventListener("abort", onAbort, { once: true });
  });
}

export async function runCollectorLoop<Result>({
  intervalMilliseconds,
  signal,
  runCycle,
  wait = waitForCollectorDelay,
  now = Date.now,
  onCycleStart,
  onCycleComplete,
  onCycleFailure,
}: CollectorLoopOptions<Result>): Promise<void> {
  while (!signal.aborted) {
    const startedAt = now();
    onCycleStart?.();

    try {
      const result = await runCycle();
      onCycleComplete?.(result, now() - startedAt);
    } catch (error) {
      onCycleFailure?.(error, now() - startedAt);
    }

    if (signal.aborted || !(await wait(intervalMilliseconds, signal))) return;
  }
}

export function sanitizedErrorName(error: unknown): string {
  if (!(error instanceof Error)) return "UnknownError";
  return /^[A-Za-z][A-Za-z0-9]*Error$/.test(error.name) ? error.name : "Error";
}
