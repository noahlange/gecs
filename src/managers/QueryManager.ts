import type { QueryStep, BaseType } from '../types';
import type { EntityManager } from './EntityManager';
import type { Entity } from '../ecs';

import { Query } from '../lib';
import { EntityIndex } from '../lib/EntityIndex';
/**
 * Responsible for resolving each query into a series of IDs.
 */
export class QueryManager {
  protected entities: EntityManager;
  protected queries: Record<string, Query> = {};

  public added: Map<bigint, Set<Entity>> = new Map();
  public removed: Map<bigint, Set<Entity>> = new Map();
  public index = new EntityIndex();

  /**
   * Add new entries to and remove old entries from the index.
   */
  protected reindex(): void {
    for (const [key, values] of this.added.entries()) {
      this.index.append(key, Array.from(values));
    }
    for (const [key, values] of this.removed.entries()) {
      this.index.remove(key, Array.from(values));
    }
  }

  public cleanup(): void {
    this.added.clear();
    this.removed.clear();
  }

  /**
   * Update indices and queries without modifying adds/removes.
   * Primarily used to
   */
  public update(): void {
    this.reindex();
    for (const key in this.queries) {
      this.queries[key].update();
    }
  }

  public getQuery<
    T extends BaseType = BaseType,
    E extends Entity<T> = Entity<T>
  >(steps: QueryStep[]): Query<T, E> {
    this.reindex();
    const key = steps.map(k => k.key).join('::');
    if (!this.queries[key]) {
      this.queries[key] = new Query(this.entities, steps);
    }
    return this.queries[key] as Query<T, E>;
  }

  public constructor(manager: EntityManager) {
    this.entities = manager;
  }
}
