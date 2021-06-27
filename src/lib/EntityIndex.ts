import type { Entity } from '../ecs';

export class EntityIndex {
  protected map: Map<bigint, Set<Entity>> = new Map();

  public all(): Entity[] {
    const res = [];
    for (const set of this.map.values()) {
      res.push(...set);
    }
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
  public get(keys: bigint[]): Entity[] {
    const res = [];
    for (const key of keys) {
      res.push(...(this.map.get(key) ?? []));
    }
    return res;
  }

  /**
   * For a given key, index additional entities.
   */
  public append(key: bigint, entity: Entity): void {
    const value = this.map.get(key) ?? new Set();
    this.map.set(key, value.add(entity));
  }

  /**
   * For a given key, remove given entities.
   */
  public remove(key: bigint, entity: Entity): void {
    const value = this.map.get(key);
    if (value) {
      value.delete(entity);
    }
  }
}
