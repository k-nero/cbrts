type Timer = {
  set: (fn: () => void, ms: number) => unknown;
  clear: (handle: unknown) => void;
};

const browserTimer: Timer = {
  set: (fn, ms) => setTimeout(fn, ms),
  clear: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

/**
 * Settles on the newest value once `ms` pass without another push, so a burst of edits asks the server
 * once. The timer is injectable for tests.
 */
export class Debouncer<T> {
  private handle: unknown = null;

  constructor(
    private readonly ms: number,
    private readonly onSettle: (value: T) => void,
    private readonly timer: Timer = browserTimer,
  ) {}

  push(value: T): void {
    this.cancel();
    this.handle = this.timer.set(() => {
      this.handle = null;
      this.onSettle(value);
    }, this.ms);
  }

  cancel(): void {
    if (this.handle !== null) this.timer.clear(this.handle);
    this.handle = null;
  }
}
