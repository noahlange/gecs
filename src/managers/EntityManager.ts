import type { Entity, EntityClass } from '../ecs';
import type { BaseType, PartialBaseType } from '../types';

import { QueryType } from '../types';

import { QueryBuilder, Registry } from '../lib';
import { QueryManager } from './QueryManager';

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

  public index(entity: Entity): void {
    this.queries.index(entity);
  }

  public unindex(entity: Entity): void {
    this.queries.unindex(entity);
  }

  public cleanup(): void {
    for (const entity of this.toDestroy) {
      this.entities.delete(entity.id);
      this.queries.unindex(entity);
    }
    this.toDestroy.clear();
    this.queries.cleanup();
  }

  public getID(key: QueryType, name: string): bigint | null {
    return this.registries[key].getID(name);
  }

  public destroy(entity: Entity): void {
    this.toDestroy.add(entity);
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
    const cmp = this.registries[QueryType.CMP].register(
      entity.items.map(e => (Array.isArray(e) ? e[0].type : e.type))
    );

    entity.ids = {
      // we're tagging all entities with any array component so we can quickly filter in array/non-array queries
      [QueryType.CMP]: isArray ? [cmp] : cmp,
      [QueryType.ENT]: this.registries[QueryType.ENT].register([Entity.id]),
      [QueryType.TAG]: this.registries[QueryType.TAG].register(tags)
    };

    this.entities.set(entity.id, entity);
    this.queries.index(entity);

    return entity;
  }
}
