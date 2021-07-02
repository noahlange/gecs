import type { ComponentClass, Entity, EntityClass } from '../ecs';
import type { BaseDataType, BaseType, QueryStep } from '../types';

import { getID } from '../ids';
import { match } from '../utils';
import { EntityIndex } from './EntityIndex';
import { Query } from './Query';
import { QueryBuilder } from './QueryBuilder';
import { Registry } from './Registry';

export class Manager {
  // map tags/components/entity types to bigints for bitmasking
  protected registry = new Registry();

  // cached queries
  protected queries: Record<string, Query> = {};
  protected tags: Record<string, string> = {};

  protected toDestroy: Set<Entity> = new Set();
  protected toIndex: Map<Entity, bigint> = new Map();

  // maps bigints to result sets
  public index = new EntityIndex();

  public get $(): QueryBuilder {
    return new QueryBuilder(this);
  }

  protected getEntityKey(entity: Entity): bigint {
    return this.registry.add(
      ...entity.items.map(e => e.type),
      ...Array.from(entity.tags).map(t => this.getTagKey(t))
    );
  }

  public getQuery<
    T extends BaseType = BaseType,
    E extends Entity<T> = Entity<T>
  >(steps: QueryStep[], id: string): Query<T, E> {
    if (!this.queries[id]) {
      this.queries[id] = new Query(this, steps);
    }
    return this.queries[id] as Query<T, E>;
  }

  public register(...items: ComponentClass[]): void {
    this.registry.add(...items.map(item => item.type));
  }

  /**
   * Generate or return a unique ID corresponding to a single tag name.
   *
   * @remarks
   * We're generating an ID here because there might be overlap in component types and tag names.
   */
  public getTagKey(tag: string): string {
    const key = (this.tags[tag] ??= getID());
    this.registry.add(key);
    return key;
  }

  // Indicate that we've modified the entity; index the current key to see how it's changed at the end of the tick.
  public indexEntity(entity: Entity): void {
    this.toIndex.set(entity, entity.key ?? null);
  }

  // Determine which items need to be added to queries, removed from queries or destroyed.
  public tick(): void {
    const added: Entity[] = [];
    const removed: Entity[] = Array.from(this.toDestroy);

    // get the union of every id modified over the last tick
    let modified = 0n;

    for (const [entity, key] of this.toIndex) {
      entity.key = this.getEntityKey(entity);
      // update the union
      modified |= key | entity.key;

      if (!key) {
        // the entity has not yet been created
        added.push(entity);
        this.index.append(entity.key, entity);
      } else if (entity.key !== key) {
        // the entry has been created and has changed (old key !== new key)
        removed.push(entity);
        // only add it if it's going to exist next tick.
        if (!this.toDestroy.has(entity)) {
          added.push(entity);
        }
      }
    }

    for (const [name, query] of Object.entries(this.queries)) {
      if (query.destroyed) {
        delete this.queries[name];
        continue;
      }
      // only update the query if it involves something we've modified
      if (match.any(modified, query.key)) {
        query.update(added, removed);
      }
    }

    // unindex destroyed entities
    for (const e of this.toDestroy) {
      this.index.remove(e.key, e);
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
    const entity = new Entity(this, data, tags);

    this.indexEntity(entity);
    return entity;
  }
}
