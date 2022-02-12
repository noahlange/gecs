import type { Identifier } from '../types';

export class EntityIndex {
  protected map: Map<bigint, Set<Identifier>> = new Map();

  public all(): Identifier[] {
    const res = [];
    for (const set of this.map.values()) {
      res.push(...set);
    }
    // dedupe, because entities may exist in multiple sets
    return Array.from(new Set(res));
  }

  /**
   * Get all indexed bigint keys.
   */
  public keys(): bigint[] {
    return Array.from(this.map.keys());
  }

  /**
   * For an array of keys, return a flat array of corresponding entities.
   */
  public get(keys: bigint[]): Identifier[] {
    const res = [];
    for (const key of keys) {
      res.push(...(this.map.get(key) ?? []));
    }
    return res;
  }

  /**
   * For a given key, index additional entities.
   */
  public append(key: bigint, id: Identifier): void {
    const value = this.map.get(key) ?? new Set();
    this.map.set(key, value.add(id));
  }

  /**
   * For a given key, remove given entities.
   */
  public remove(key: bigint, id: Identifier): void {
    const value = this.map.get(key);
    if (value) {
      value.delete(id);
      // prune if it's empty
      if (!value.size) {
        this.map.delete(key);
      }
    }
  }
}
