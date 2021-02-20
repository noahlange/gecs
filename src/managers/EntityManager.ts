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

  protected getEntitySum(entity: Entity): bigint {
    return this.registry.add([
      (entity.constructor as EntityClass).id,
      ...entity.tags.all().map(t => (this.tags[t] ??= nanoid(6))),
      ...entity.items
        .filter(f => !!f)
        .map(e => (Array.isArray(e) ? e[0].type : e.type))
    ]);
  }

  public index(entity: Entity): void {
    // if it's already indexed, we need to unlink the old key
    if (entity.key) {
      this.unindex(entity);
    }
    // assign a new key
    entity.key = this.getEntitySum(entity);
    // push to "added"
    const value = this.queries.added.get(entity.key) ?? new Set();
    this.queries.added.set(entity.key, value.add(entity));
  }

  public unindex(entity: Entity): void {
    const next = this.getEntitySum(entity);
    const value = this.queries.removed.get(next) ?? new Set();
    this.queries.removed.set(entity.key, value.add(entity));
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
