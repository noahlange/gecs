/**
 * Small extension of the "Set" class to add map/filter/reduce methods, spread arguments for add/remove/delete/has and an optional onChange handler.
 */
export class ChangeSet<T> extends Set<T> {
  protected onChange?: () => void;

  public all(): readonly T[] {
    return Array.from(this);
  }

  public has(...items: T[]): boolean {
    for (const item of items) {
      if (!super.has(item)) {
        return false;
      }
    }
    return true;
  }

  public add(...items: T[]): this {
    for (const item of items) {
      super.add(item);
    }
    this.onChange?.();
    return this;
  }

  public clear(): void {
    super.clear();
    this.onChange?.();
  }

  public delete(...items: T[]): boolean {
    for (const item of items) {
      super.delete(item);
    }
    this.onChange?.();
    return true;
  }

  public remove(...items: T[]): void {
    this.delete(...items);
  }

  public constructor(items: T[], onChange?: () => void) {
    super(items);
    this.onChange = onChange;
  }
}
