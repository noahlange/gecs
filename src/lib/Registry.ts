import type { Identifier } from '../types';

import { bigintID, union } from '../utils';

/**
 * Map human-readable identifiers (nanoids, tags, .type, etc) to bigints for
 * faster bitmask queries.
 */
export class Registry {
  protected id = bigintID();
  protected registry: Record<Identifier, bigint> = {};

  public add(...keys: Identifier[]): bigint {
    const res: bigint[] = [];
    for (const key of keys) {
      res.push((this.registry[key] ??= this.id()));
    }
    return union(...res);
  }

  public getID(...keys: Identifier[]): bigint | null {
    const res = union(...keys.map(key => this.registry[key] ?? 0n));
    return res === 0n ? null : res;
  }
}
