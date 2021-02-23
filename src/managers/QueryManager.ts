import type { QueryStep, BaseType } from '../types';
import type { EntityManager } from './EntityManager';
import type { Entity } from '../ecs';

import { Query } from '../lib';
import { EntityIndex } from '../lib/EntityIndex';
import type { Unsubscribe } from 'nanoevents';
import { createNanoEvents } from 'nanoevents';

interface QueryEvents {
  added: (entity: Entity[]) => void;
  removed: (entity: Entity[]) => void;
}

/**
 * Responsible for resolving each query into a series of IDs.
 */
export class QueryManager {
  protected entities: EntityManager;
  protected queries: Record<string, Query> = {};
  protected events = createNanoEvents<QueryEvents>();

  public index = new EntityIndex();

  protected reduceUpdate(entities: Set<Entity>): Map<bigint, Entity[]> {
    return Array.from(entities).reduce((a, b) => {
      const arr = a.get(b.key) ?? [];
      arr.push(b);
      a.set(b.key, arr);
      return a;
    }, new Map<bigint, Entity[]>());
  }

  public on<K extends keyof QueryEvents>(
    event: K,
    callback: QueryEvents[K]
  ): Unsubscribe {
    return this.events.on(event, callback);
  }

  public getQuery<
    T extends BaseType = BaseType,
    E extends Entity<T> = Entity<T>
  >(steps: QueryStep[]): Query<T, E> {
    const key = steps.map(k => k.key).join('::');
    if (!this.queries[key]) {
      this.queries[key] = new Query(this, this.entities, steps);
    }
    return this.queries[key] as Query<T, E>;
  }

  public remove(entities: Set<Entity>): void {
    const removals: Entity[] = [];
    for (const [key, values] of this.reduceUpdate(entities).entries()) {
      this.index.remove(key, values);
      removals.push(...values);
    }
    this.events.emit('removed', removals);
  }

  public add(entities: Set<Entity>): void {
    const additions: Entity[] = [];
    for (const [key, values] of this.reduceUpdate(entities).entries()) {
      this.index.append(key, values);
      additions.push(...values);
    }
    this.events.emit('added', additions);
  }

  public init(): void {}

  public constructor(manager: EntityManager) {
    this.entities = manager;
  }
}
