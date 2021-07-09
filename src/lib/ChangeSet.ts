/**
 * Rudimentary string set supporting a change callback. Marginally more efficient than an actual Set.
 */

export class ChangeSet {
  protected onChange?: () => void;
  protected items: Record<string, unknown> = {};

  public *[Symbol.iterator](): Iterator<string> {
    yield* this.all();
  }

  public all(): string[] {
    return Object.keys(this.items);
  }

  public has(...items: string[]): boolean {
    for (const item of items) {
      if (!(item in this.items)) {
        return false;
      }
    }
    return true;
  }

  public add(...items: string[]): this {
    let changed = false;
    for (const item of items) {
      if (!(item in this.items)) {
        this.items[item] = true;
        changed = true;
      }
    }
    if (changed) {
      this.onChange?.();
    }
    return this;
  }

  public clear(): void {
    this.items = {};
    this.onChange?.();
  }

  public remove(...items: string[]): boolean {
    let changed = false;

    for (const item of items) {
      if (item in this.items) {
        delete this.items[item];
        changed = true;
      }
    }

    if (changed) {
      this.onChange?.();
    }
    return true;
  }

  public constructor(items: string[], onChange?: () => void) {
    this.items = items.reduce((a, b) => ({ ...a, [b]: true }), {});
    this.onChange = onChange;
  }
}
