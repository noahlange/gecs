import type { ComponentClass, Entity, EntityClass } from '../ecs';
import type { BaseType, PartialBaseType } from '../types';

import { QueryBuilder, Registry } from '../lib';
import { QueryManager } from './QueryManager';

import { isEntityClass } from '../utils';
import { getID } from '../ids';

export class EntityManager {
  // map tags/components/entity types to bigints for bitmasking
  public registry = new Registry();

  public entities: Map<string, Entity> = new Map();
  public queries = new QueryManager(this);
  public tags: Record<string, string> = {};

  protected toDestroy: Set<Entity> = new Set();

  // entity updates we're saving up for the end of the tick.
  protected adds: Set<Entity> = new Set();
  protected removes: Set<Entity> = new Set();

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

  public getTagKey(tag: string): string {
    const key = (this.tags[tag] ??= getID());
    this.registry.register(key);
    return key;
  }

  protected getEntityKey(entity: Entity): bigint {
    return this.registry.add([
      (entity.constructor as EntityClass).id,
      ...entity.tags.map(t => this.getTagKey(t)),
      ...entity.items.map(e => e.type)
    ]);
  }

  public index(entity: Entity): void {
    // if it's already indexed, we need to unlink the old key
    if (entity.key) {
      this.unindex(entity);
    }
    this.adds.add(entity);
  }

  public unindex(entity: Entity): void {
    this.removes.add(entity);
  }

  public tick(): void {
    // make sure the old IDs are in place when we remove.
    this.queries.remove(this.removes);
    this.removes.clear();

    // make sure the new IDs are in place when we add
    for (const addition of this.adds) {
      addition.key = this.getEntityKey(addition);
    }

    this.queries.add(this.adds);
    this.adds.clear();

    for (const entity of this.toDestroy) {
      this.entities.delete(entity.id);
    }

    this.toDestroy.clear();
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

  public constructor() {
    this.queries.init();
  }
}
