import type { Entity } from '../ecs';

export class EntityIndex {
  protected map: Map<bigint, Set<Entity>> = new Map();

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
  public append(key: bigint, entities: Entity[]): void {
    const value = this.map.get(key) ?? new Set();
    for (const entity of entities) {
      value.add(entity);
    }
    this.map.set(key, new Set(value));
  }

  /**
   * For a given key, remove given entities.
   */
  public remove(key: bigint, entities: Entity[]): void {
    const value = this.map.get(key) ?? new Set();
    for (const e of entities) {
      value.delete(e);
    }
    this.map.set(key, value);
  }
}
