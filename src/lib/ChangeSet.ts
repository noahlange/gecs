/**
 * Rudimentary string set with a change callback.
 */
export class ChangeSet {
  protected onChange?: () => void;
  protected tags: Record<string, unknown> = {};

  public *[Symbol.iterator](): Iterator<string> {
    yield* this.all();
  }

  public all(): string[] {
    return Object.keys(this.tags);
  }

  public has(...items: string[]): boolean {
    for (const item of items) {
      if (!(item in this.tags)) {
        return false;
      }
    }
    return true;
  }

  public add(...items: string[]): this {
    let changed = false;
    for (const item of items) {
      if (!(item in this.tags)) {
        this.tags[item] = true;
        changed = true;
      }
    }
    if (changed) {
      this.onChange?.();
    }
    return this;
  }

  public clear(): void {
    this.tags = {};
    this.onChange?.();
  }

  public delete(...items: string[]): boolean {
    let changed = false;

    for (const item of items) {
      if (item in this.tags) {
        delete this.tags[item];
        changed = true;
      }
    }

    if (changed) {
      this.onChange?.();
    }
    return true;
  }

  public remove(...items: string[]): void {
    this.delete(...items);
  }

  public constructor(items: string[], onChange?: () => void) {
    this.tags = items.reduce((a, b) => ({ ...a, [b]: true }), {});
    this.onChange = onChange;
  }
}
