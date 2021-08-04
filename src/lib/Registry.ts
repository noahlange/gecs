import { intID, union } from '../utils';

/**
 * Map human-readable identifiers (nanoids, tags, .type, etc) to bigints for faster,
 * bitmask-based searches.
 */
export class Registry {
  protected id = intID();
  protected registry: Record<string, bigint> = {};

  public add(...keys: string[]): bigint {
    const res: bigint[] = [];
    for (const key of keys) {
      if (!this.registry[key]) {
        this.registry[key] = this.id();
      }
      res.push(this.registry[key]);
    }
    return union(...res);
  }

  public getID(...keys: string[]): bigint | null {
    const res = union(...keys.map(key => this.registry[key] ?? 0n));
    return res === 0n ? null : res;
  }
}
