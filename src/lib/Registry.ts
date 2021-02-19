import type { QueryType } from '../types';
import { id, union } from '../utils';

/**
 * Map human-readable identifiers (nanoid, .type, etc) to bigints for faster,
 * bitmask-based searches. Each major query type has its own registry to avoid
 * overflowing the ID generator, which I have done.
 */
export class Registry {
  protected id = id();
  protected registry: Record<string, bigint> = {};
  protected type: QueryType;
  protected pass: boolean = false;

  public register(key: string): void {
    this.registry[key] = this.id();
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

  public constructor(type: QueryType) {
    this.type = type;
  }
}
