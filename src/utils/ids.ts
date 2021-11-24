/**
 * Return consecutive ints.
 */
export function* intID(): IterableIterator<number> {
  let id = 1;
  do {
    yield id++;
  } while (true);
}

/**
 * Return bigints increasing by powers of 2.
 * 0001 -> 0010 -> 0100 -> 1000, etc.
 */
export function* bigintID(): IterableIterator<bigint> {
  let id = 1n;
  do {
    yield 1n << id++;
  } while (true);
}

/**
 * Generic ID generator with ID recycling.
 */
export class IDGenerator<T> {
  public static from<T>(generator: () => IterableIterator<T>): IDGenerator<T> {
    const gen = generator();
    return new IDGenerator(() => gen.next().value);
  }

  protected released: T[] = [];
  protected generator: () => T;

  public release(id: T): void {
    this.released.push(id);
  }

  public next(): T {
    const next = this.released.shift();
    return next ?? this.generator();
  }

  protected constructor(generator: () => T) {
    this.generator = generator;
  }
}
