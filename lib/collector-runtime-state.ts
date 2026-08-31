export type CollectorLifecycleState = "starting" | "running" | "stopping" | "stopped";
export type CollectorLastCycleStatus = "completed" | "partial" | "failed" | null;

export interface CollectorRuntimeStateSnapshot {
  lifecycle: CollectorLifecycleState;
  processStartedAt: string;
  lastCycleStartedAt: string | null;
  lastCycleCompletedAt: string | null;
  lastCycleStatus: CollectorLastCycleStatus;
  consecutiveCycleFailures: number;
  totalCyclesCompleted: number;
}

export class CollectorRuntimeState {
  #state: CollectorRuntimeStateSnapshot;

  constructor(processStartedAt = new Date()) {
    this.#state = {
      lifecycle: "starting",
      processStartedAt: processStartedAt.toISOString(),
      lastCycleStartedAt: null,
      lastCycleCompletedAt: null,
      lastCycleStatus: null,
      consecutiveCycleFailures: 0,
      totalCyclesCompleted: 0,
    };
  }

  snapshot(): Readonly<CollectorRuntimeStateSnapshot> {
    return { ...this.#state };
  }

  markRunning(): void {
    this.#transition("starting", "running");
  }

  markStopping(): void {
    if (this.#state.lifecycle === "stopping") return;
    this.#transition("running", "stopping");
  }

  markStopped(): void {
    this.#transition("stopping", "stopped");
  }

  cycleStarted(at: Date): void {
    this.#state.lastCycleStartedAt = at.toISOString();
  }

  cycleCompleted(status: Exclude<CollectorLastCycleStatus, "failed" | null>, at: Date): void {
    this.#state.lastCycleCompletedAt = at.toISOString();
    this.#state.lastCycleStatus = status;
    this.#state.consecutiveCycleFailures = 0;
    this.#state.totalCyclesCompleted += 1;
  }

  cycleFailed(at: Date): void {
    this.#state.lastCycleCompletedAt = at.toISOString();
    this.#state.lastCycleStatus = "failed";
    this.#state.consecutiveCycleFailures += 1;
    this.#state.totalCyclesCompleted += 1;
  }

  #transition(from: CollectorLifecycleState, to: CollectorLifecycleState): void {
    if (this.#state.lifecycle !== from) {
      throw new Error(`Invalid collector lifecycle transition from ${this.#state.lifecycle} to ${to}`);
    }
    this.#state.lifecycle = to;
  }
}

