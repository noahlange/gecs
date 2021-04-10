interface Callback<T, U> {
  (item: T, index: number, items: readonly T[]): U;
}

interface ReduceCallback<T, U> {
  (previous: U, current: T, index: number, items: readonly T[]): U;
}

/**
 * Small extension of the "Set" class to add map/filter/reduce methods and spread arguments for add/remove/delete/has.
 */
export class ExtSet<T> extends Set<T> {
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
    return this;
  }

  public delete(...items: T[]): boolean {
    for (const item of items) {
      super.delete(item);
    }
    return true;
  }

  public remove(...items: T[]): void {
    this.delete(...items);
  }

  public map<U>(callback: Callback<T, U>): ExtSet<U> {
    return new ExtSet<U>(Array.from(this).map(callback));
  }

  public filter(callback: Callback<T, boolean>): ExtSet<T> {
    return new ExtSet<T>(Array.from(this).filter(callback));
  }

  public reduce<U>(callback: ReduceCallback<T, U>, initial: U): U {
    return Array.from(this).reduce(callback, initial);
  }
}
