import type { QueryType } from '../types';
import { id, union } from '../utils';

/**
 * Map human-readable identifiers (nanoid, .type, etc) to bigints for bitmask
 * searches. Each major query type has its own registry to avoid overflowing
 * the ID generator.
 */
export class Registry {
  protected id = id();
  protected registry: Map<string, bigint> = new Map();
  protected type: QueryType;
  protected pass: boolean = false;

  public register(keys: string[]): bigint {
    const res: bigint[] = [];
    for (const key of keys) {
      const id = this.registry.get(key) ?? this.id();
      this.registry.set(key, id);
      res.push(id);
    }
    return union(...res);
  }

  public getID(key: string): bigint | null {
    return this.registry.get(key) ?? null;
  }

  public constructor(type: QueryType) {
    this.type = type;
  }
}
