import type { QueryStep } from '../types';
import type { EntityManager } from './EntityManager';
import type { Entity } from '../ecs';

import { QueryType, QueryTag } from '../types';
import { difference, intersection, union } from '../utils';
import { QueryCache } from './QueryCache';
import { EntityIndex } from './EntityIndex';

/**
 * Responsible for resolving each query into a series of IDs.
 */
export class QueryManager {
  protected idx: EntityIndex;
  protected entities: EntityManager;
  protected cache: QueryCache;

  /**
   * Also strips keys from later steps.
   */
  protected sortSteps(steps: QueryStep[]): QueryStep[] {
    return steps
      .filter(step => step.tag !== QueryTag.SOME)
      .sort((a, b) => a.type - b.type)
      .map((step, i) =>
        i > 0 || step.type === QueryType.ID ? { ...step, key: '' } : step
      );
  }

  /**
   * @privateRemarks
   * Credit and gratitude to [ape-ecs](https://github.com/fritzy/ape-ecs) for the inspiration.
   */
  protected filterResults(step: QueryStep, entities: string[]): string[] {
    // if we have a static ID list, use that
    if (step.type === QueryType.ID) {
      return entities.length ? intersection(entities, step.items) : step.items;
    }

    // otherwise get registry IDs for step items
    const ids = step.items.map(i => this.entities.getID(step.type, i));
    const rest = this.idx.all(ids);

    // all/any
    if (step.tag !== QueryTag.NONE) {
      if (step.tag === QueryTag.ALL && rest.length > 1) {
        return entities.length
          ? intersection(entities, ...rest)
          : intersection(...rest);
      } else {
        return entities.length
          ? intersection(entities, union(...rest))
          : union(...rest);
      }
    } else {
      return difference(
        entities.length ? entities : Array.from(this.entities.entities.keys()),
        ...rest
      );
    }
  }

  public unindex(entity: Entity): void {
    this.cache.tag(entity.id, entity.ids);
    this.idx.unindex(entity.id, entity.ids);
  }

  public index(entity: Entity): void {
    this.cache.tag(entity.id, entity.ids);
    this.idx.index(entity.id, entity.ids);
  }

  public cleanup(): void {
    this.cache.refresh();
  }

  public execute(steps: QueryStep[]): Entity[] {
    let ids: string[] = [];

    for (const step of this.sortSteps(steps)) {
      if (this.cache.has(step)) {
        // if we have the step cached, use that (updating if necessary)
        ids = this.cache.get(step, changes =>
          this.filterResults(step, changes).filter(
            id => !this.entities.toDestroy.has(id)
          )
        );
        continue;
      }
      // otherwise, filter
      ids = this.filterResults(step, ids);
      // fail-fast
      if (!ids.length) {
        return [];
      }
      // key is stripped from later steps
      if (step.key) {
        // cache the results from the query step
        ids = this.cache.set(step, ids);
      }
    }

    const res: Entity[] = [];
    for (const id of new Set(ids)) {
      const entity = this.entities.entities.get(id);
      if (entity) {
        res.push(entity);
      }
    }
    return res;
  }

  public constructor(manager: EntityManager) {
    this.entities = manager;
    this.idx = new EntityIndex();
    this.cache = new QueryCache(manager);
  }
}
