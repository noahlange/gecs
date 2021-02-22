import type { ComponentClass, Entity, EntityClass } from '../ecs';
import type { BaseType, PartialBaseType } from '../types';

import { QueryBuilder, Registry } from '../lib';
import { QueryManager } from './QueryManager';
import { nanoid } from 'nanoid/non-secure';

const isEntityClass = (e: ComponentClass | EntityClass): e is EntityClass => {
  return !('type' in e);
};
export class EntityManager {
  public registry = new Registry();

  public entities: Map<string, Entity> = new Map();
  public queries = new QueryManager(this);
  public toDestroy: Set<Entity> = new Set();
  public tags: Record<string, string> = {};

  public get query(): QueryBuilder {
    return new QueryBuilder(this, this.queries);
  }

  public register(...items: (ComponentClass | EntityClass)[]): void {
    for (const item of items) {
      isEntityClass(item)
        ? this.registry.register(item.id)
        : this.registry.register(item.type);
    }
  }

  protected getEntityKey(entity: Entity): bigint {
    return this.registry.add([
      (entity.constructor as EntityClass).id,
      ...entity.tags.all().map(t => (this.tags[t] ??= nanoid(6))),
      ...entity.items.filter(f => !!f).map(e => e.type)
    ]);
  }

  public index(entity: Entity): void {
    // if it's already indexed, we need to unlink the old key
    if (entity.key) {
      this.unindex(entity);
    }
    // assign a new key
    entity.key = this.getEntityKey(entity);
    // push to "added"
    const value = this.queries.added.get(entity.key) ?? new Set();
    this.queries.added.set(entity.key, value.add(entity));
  }

  public unindex(entity: Entity): void {
    // it's possible for an entity to be created and unindexed within the same tick; if it's still in the added set, we're going to remove it.
    const added = this.queries.added.get(entity.key) ?? new Set();

    added.delete(entity);
    this.queries.added.set(entity.key, added);
    // and then, as expected, we'll add it to the removed set.
    const removed = this.queries.removed.get(entity.key) ?? new Set();
    this.queries.removed.set(entity.key, removed.add(entity));
  }

  public cleanup(): void {
    for (const entity of this.toDestroy) {
      this.entities.delete(entity.id);
    }
    this.toDestroy.clear();
    this.queries.cleanup();
  }

  public getID(name: string): bigint | null {
    return this.registry.getID(name);
  }

  public destroy(entity: Entity): void {
    this.toDestroy.add(entity);
    this.unindex(entity);
  }

  public create<T extends BaseType>(
    Entity: EntityClass<T>,
    data: PartialBaseType<T> = {},
    tags: string[] = []
  ): Entity<T> {
    const entity = new Entity(
      this,
      Object.assign(Entity.data ?? {}, data),
      tags
    );

    this.entities.set(entity.id, entity);
    this.index(entity);

    return entity;
  }
}
