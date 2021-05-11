import type { ComponentClass, Entity, EntityClass } from '../ecs';
import type { BaseDataType, BaseType, QueryStep } from '../types';
import type { Unsubscribe } from 'nanoevents';

import { createNanoEvents } from 'nanoevents';

import { getID } from '../ids';
import { isEntityClass } from '../utils';
import { Query, QueryBuilder, Registry } from '.';
import { EntityIndex } from './EntityIndex';

interface ChangeEvents {
  removed: (entities: Entity[]) => void;
  added: (entities: Entity[]) => void;
}

export class Manager {
  // map tags/components/entity types to bigints for bitmasking
  protected registry = new Registry();
  // cached queries
  protected queries: Record<string, Query> = {};
  protected tags: Record<string, string> = {};
  protected events = createNanoEvents<ChangeEvents>();
  protected toDestroy: Set<Entity> = new Set();
  // entity updates we're saving up for the end of the tick.
  protected added = new Set<Entity>();
  protected removed = new Set<Entity>();

  // maps bigints to result sets
  public index = new EntityIndex();

  public get query(): QueryBuilder {
    return new QueryBuilder(this);
  }

  protected getEntityKey(entity: Entity): bigint {
    return this.registry.add([
      (entity.constructor as EntityClass).id,
      ...Array.from(entity.tags).map(t => this.getTagKey(t)),
      ...entity.items.map(e => e.type)
    ]);
  }

  public getQuery<
    T extends BaseType = BaseType,
    E extends Entity<T> = Entity<T>
  >(steps: QueryStep[]): Query<T, E> {
    const key = steps.map(k => k.key).join('::');
    if (!this.queries[key]) {
      this.queries[key] = new Query(this, steps);
    }
    return this.queries[key] as Query<T, E>;
  }

  public register(...items: (ComponentClass | EntityClass)[]): void {
    for (const item of items) {
      this.registry.register(isEntityClass(item) ? item.id : item.type);
    }
  }

  public getTagKey(tag: string): string {
    const key = (this.tags[tag] ??= getID());
    this.registry.register(key);
    return key;
  }

  public on<K extends keyof ChangeEvents>(
    event: K,
    callback: ChangeEvents[K]
  ): Unsubscribe {
    return this.events.on(event, callback);
  }

  public indexEntity(entity: Entity): void {
    // if it's already indexed, we need to remove the old item
    if (entity.key) {
      this.removed.add(entity);
    }
    this.added.add(entity);
  }

  public tick(): void {
    // make sure the old IDs are in place when we remove.
    for (const item of this.removed) {
      this.index.remove(item.key, item);
      item.key = this.getEntityKey(item);
    }
    this.events.emit('removed', Array.from(this.removed));
    this.removed.clear();

    // make sure the new IDs are in place when we add
    for (const addition of this.added) {
      addition.key = this.getEntityKey(addition);
      this.index.append(addition.key, addition);
    }
    this.events.emit('added', Array.from(this.added));
    this.added.clear();
  }

  public getID(name: string): bigint | null {
    return this.registry.getID(name);
  }

  public destroy(entity: Entity): void {
    this.removed.add(entity);
  }

  public create<T extends BaseType>(
    Entity: EntityClass<T>,
    data: BaseDataType<T> = {},
    tags: string[] = []
  ): Entity<T> {
    const entity = new Entity(
      this,
      Object.assign(Entity.data ?? {}, data),
      tags
    );

    this.indexEntity(entity);
    return entity;
  }
}
