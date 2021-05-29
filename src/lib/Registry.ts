import { intID } from '../ids';
import { union } from '../utils';

/**
 * Map human-readable identifiers (nanoid, .type, etc) to bigints for faster,
 * bitmask-based searches.
 */
export class Registry {
  protected id = intID();
  protected registry: Record<string, bigint> = {};

  public register(key: string): void {
    if (!(key in this.registry)) {
      this.registry[key] = this.id();
    }
  }

  public add(keys: string[]): bigint {
    const res: bigint[] = [];
    for (const key of keys) {
      if (!(key in this.registry)) {
        this.register(key);
      }
      res.push(this.registry[key]);
    }
    return union(...res);
  }

  public getID(key: string): bigint | null {
    return this.registry[key] ?? null;
  }
}
