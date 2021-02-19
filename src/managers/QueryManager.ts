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

  public added: Set<Entity> = new Set();
  public removed: Set<Entity> = new Set();

  public updateQueries(): void {
    for (const key in this.queries) {
      this.queries[key].update();
    }
  }

  public cleanup(): void {
    this.updateQueries();
    this.added.clear();
    this.removed.clear();
  }

  public getQuery(steps: QueryStep[]): Query {
    const key = steps.map(k => k.key).join('::');
    if (!this.queries[key]) {
      this.queries[key] = new Query(this.entities, steps);
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
