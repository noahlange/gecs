interface Callback<T, U> {
  (item: T, index: number, items: readonly T[]): U;
}

interface ReduceCallback<T, U> {
  (previous: U, current: T, index: number, items: readonly T[]): U;
}

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

  public map<U>(callback: Callback<T, U>): ChangeSet<U> {
    return new ChangeSet<U>(Array.from(this).map(callback));
  }

  public filter(callback: Callback<T, boolean>): ChangeSet<T> {
    return new ChangeSet<T>(Array.from(this).filter(callback));
  }

  public reduce<U>(callback: ReduceCallback<T, U>, initial: U): U {
    return Array.from(this).reduce(callback, initial);
  }

  public constructor(items: T[], changeHandler?: () => void) {
    super(items);
    this.onChange = changeHandler;
  }
}
