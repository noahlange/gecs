import type { ComponentClass, Entity, EntityClass } from '../ecs';
import type { BaseType, PartialBaseType } from '../types';

import { QueryType } from '../types';

import { QueryBuilder, Registry } from '../lib';
import { QueryManager } from './QueryManager';

const isEntityClass = (e: ComponentClass | EntityClass): e is EntityClass => {
  return !('type' in e);
};
export class EntityManager {
  public registries = {
    [QueryType.CMP]: new Registry(QueryType.CMP),
    [QueryType.TAG]: new Registry(QueryType.TAG),
    [QueryType.ENT]: new Registry(QueryType.ENT)
  };

  public entities: Map<string, Entity> = new Map();
  public queries = new QueryManager(this);
  public toDestroy: Set<Entity> = new Set();

  protected eids: Record<string, string[]> = {};
  public get query(): QueryBuilder {
    return new QueryBuilder(this, this.queries);
  }

  public register(...items: (ComponentClass | EntityClass)[]): void {
    for (const item of items) {
      isEntityClass(item)
        ? this.registries[QueryType.ENT].register(item.id)
        : this.registries[QueryType.CMP].register(item.type);
    }
  }

  public index(entity: Entity): void {
    this.queries.added.add(entity);
  }

  public unindex(entity: Entity): void {
    this.queries.removed.add(entity);
  }

  public cleanup(): void {
    for (const entity of this.toDestroy) {
      this.entities.delete(entity.id);
    }
    this.toDestroy.clear();
    this.queries.cleanup();
  }

  public getID(key: QueryType, name: string): bigint | null {
    return this.registries[key].getID(name);
  }

  public destroy(entity: Entity): void {
    this.toDestroy.add(entity);
    this.queries.removed.add(entity);
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

    const isArray = entity.items.some(i => Array.isArray(i));
    const cmp = this.registries[QueryType.CMP].add(
      entity.items.map(e => (Array.isArray(e) ? e[0].type : e.type))
    );

    entity.ids = {
      // we're tagging all entities with any array component so we can quickly filter in array/non-array queries
      [QueryType.CMP]: isArray ? [cmp] : cmp,
      [QueryType.ENT]: this.registries[QueryType.ENT].add([Entity.id]),
      [QueryType.TAG]: this.registries[QueryType.TAG].add(tags)
    };

    this.entities.set(entity.id, entity);
    this.queries.added.add(entity);

    return entity;
  }
}
