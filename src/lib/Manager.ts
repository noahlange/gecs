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

  // maps bigints to result sets
  public index = new EntityIndex();

  public get $(): QueryBuilder {
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

  protected toIndex: Map<Entity, bigint> = new Map();

  // multi-step process:
  // 1. first, we indicate we want to index it and save it with its current (i.e., beginning-of-tick) key
  public indexEntity(entity: Entity): void {
    this.toIndex.set(entity, entity.key ?? null);
  }

  // multi-step process, cont'd:
  // 2. at the end the tick, we'll determine which items _actually_ need to be added or removed
  public tick(): void {
    const removed = [];
    const added = [];

    for (const [entity, key] of this.toIndex) {
      entity.key = this.getEntityKey(entity);
      if (!key) {
        added.push(entity);
        this.index.append(entity.key, entity);
      } else if (entity.key !== key) {
        removed.push(entity);
        added.push(entity);
      }
    }

    // un-index the to-be-destroyeds as well
    for (const entity of this.toDestroy) {
      removed.push(entity);
    }

    if (removed.length) {
      this.events.emit('removed', removed);
    }

    if (added.length) {
      this.events.emit('added', added);
    }

    this.toIndex.clear();
    this.toDestroy.clear();
  }

  public getID(name: string): bigint | null {
    return this.registry.getID(name);
  }

  public destroy(entity: Entity): void {
    this.toDestroy.add(entity);
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
