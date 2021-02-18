import type { Entity, EntityClass } from '../ecs';
import type { BaseType, PartialBaseType } from '../types';

import emitter from 'namespace-emitter';

import { QueryType } from '../types';

import { QueryBuilder, Registry } from '.';
import { QueryManager } from './QueryManager';

export class EntityManager {
  public registries = {
    [QueryType.COMPONENT]: new Registry(QueryType.COMPONENT),
    [QueryType.TAG]: new Registry(QueryType.TAG),
    [QueryType.ENTITY]: new Registry(QueryType.ENTITY, true)
  };

  public entities: Map<string, Entity> = new Map();
  public queries = new QueryManager(this);
  public events = emitter();
  public toDestroy: Set<string> = new Set();

  protected eids: Record<string, string[]> = {};
  public get query(): QueryBuilder {
    return new QueryBuilder(this, this.queries);
  }

  public index(
    entity: Entity,
    key: QueryType.COMPONENT | QueryType.TAG,
    names: string[]
  ): void {
    this.queries.index(entity);
  }

  public getID(key: QueryType, name: string): string {
    if (key !== QueryType.ID) {
      return this.registries[key].getID(name);
    }
    return name;
  }

  public destroy(entity: Entity): void {
    this.toDestroy.add(entity.id);
    this.queries.unindex(entity);
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

    const entIDs = this.registries[QueryType.ENTITY].register([Entity.id]);
    const tagIDs = this.registries[QueryType.TAG].register(tags);
    const cmpIDs = this.registries[QueryType.COMPONENT].register(
      entity.items.map(e => e.type)
    );

    entity.ids = [...entIDs, ...tagIDs, ...cmpIDs];

    this.entities.set(entity.id, entity);
    this.queries.index(entity);

    return entity;
  }

  public cleanup(): void {
    for (const id of this.toDestroy) {
      this.entities.delete(id);
    }
    this.queries.cleanup();
  }
}
