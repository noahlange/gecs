import type { QueryStep } from '../types';
import type { EntityManager } from './EntityManager';
import type { Entity } from '../ecs';

import { QueryTag } from '../types';
import { Query } from '../lib';

/**
 * Responsible for resolving each query into a series of IDs.
 */
export class QueryManager {
  protected entities: EntityManager;
  protected queries: Record<string, Query> = {};

  /**
   * Also strips keys from later steps.
   */
  protected sortSteps(steps: QueryStep[]): QueryStep[] {
    return steps
      .filter(step => step.tag !== QueryTag.SOME)
      .sort((a, b) => a.type - b.type);
  }

  protected added: Set<Entity> = new Set();
  protected removed: Set<Entity> = new Set();

  public index(entity: Entity): void {
    this.added.add(entity);
  }

  public unindex(entity: Entity): void {
    this.removed.add(entity);
  }

  public cleanup(): void {
    // this can be optimized
    for (const q in this.queries) {
      const value = this.queries[q];
      value.refresh(this.added);
      value.unload(this.removed);
    }
  }

  public getQuery(steps: QueryStep[]): Query {
    const key = steps.map(k => k.key).join('::');
    if (!this.queries[key]) {
      const q = (this.queries[key] = new Query(this.entities, steps));
      q.refresh();
    }
    return this.queries[key];
  }

  public execute(steps: QueryStep[]): Entity[] {
    return this.getQuery(steps).get();
  }

  public constructor(manager: EntityManager) {
    this.entities = manager;
  }
}
