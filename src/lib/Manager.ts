import type { ComponentClass, Context, Entity, EntityClass } from '../ecs';
import type { $AnyEvil, BaseDataType, BaseType, Identifier, QueryStep } from '../types';

import { anonymous, Components, ToDestroy, ToIndex } from '../types';
import { match, union } from '../utils';
import { EntityIndex } from './EntityIndex';
import { Query } from './Query';
import { Registry } from './Registry';

interface Registrations {
  entities: Record<string, EntityClass>;
  components: Record<string, ComponentClass>;
  tags: Record<string, Identifier>;
}

export class Manager {
  public static [ToIndex]: Record<Identifier, [Entity, bigint][]> = {};
  public static [ToDestroy]: Record<Identifier, Entity[]> = {};

  /**
   * Maps bigint identifiers to result sets.
   */
  public keys: Record<Identifier, bigint> = {};
  public index: EntityIndex = new EntityIndex();
  public entities: Record<Identifier, Entity> = {};
  public id: Identifier;

  /**
   * A mapping of tag literals to tag IDs. These IDs are mapped in turn to bigints for querying.
   */
  public registrations: Registrations = {
    tags: {},
    entities: {},
    components: {}
  };

  /**
   * Map tags and components to bigints for bitmask searches.
   */
  protected registry = new Registry();
  protected ctx: Context;
  protected baseEntityKeys: Map<EntityClass, bigint> = new Map();

  /**
   * Cached queries, indexed by string key (basically a concatenation of query components).
   */
  protected queries: Record<string, Query> = {};

  /**
   * Given an array of query steps (or a string ID mapping to a combination of
   * components/tags, if we're dealing with a persisted query) return a new
   * (or cached) query object.
   */
  public getQuery<T extends BaseType = BaseType, E extends Entity<T> = Entity<T>>(
    steps: QueryStep[],
    id: string
  ): Query<T, E> {
    if (!this.queries[id]) {
      this.queries[id] = new Query(this.ctx, steps);
    }
    return this.queries[id] as Query<T, E>;
  }

  public register(entities: EntityClass[], components: ComponentClass[], tags: string[]): void {
    const allComponents = new Set([...components, ...entities.flatMap(e => e.prototype[Components])]);

    for (const component of allComponents) {
      this.registrations.components[component.type] = component;
      this.registry.add(component.type);
    }

    for (const entity of entities) {
      const types = entity.prototype[Components].map((e: ComponentClass) => e.type);
      let key = entity.name;
      if (key === anonymous) {
        key = types.join('|');
      }
      this.registrations.entities[key] = entity;
      // Each EntityClass has its 'base' (i.e., tag-independent) key. Since tags change more frequently than components, we're going to avoid recomputing the entity's entire key every time it changes.
      this.baseEntityKeys.set(entity, this.registry.getID(...types)!);
    }

    for (const tag of tags) {
      if (!(tag in this.registrations.tags)) {
        const id = (this.registrations.tags[tag] = this.ctx.ids.id.next());
        this.registry.add(id);
      }
    }
  }

  /**
   * Determine which items need to be added to queries, removed from queries or destroyed.
   */
  public tick(): void {
    const added: Entity[] = [];
    const removed: Entity[] = Array.from(Manager[ToDestroy][this.id]);
    const reindex = Manager[ToIndex][this.id];

    if (!removed.length && !reindex.length) {
      return;
    }

    // get the union of every key modified over the course of the last tick
    let modified = 0n;

    for (const [entity, oldKey] of reindex) {
      this.entities[entity.id] = entity;

      entity.key = this.getEntityKey(entity);

      // the entry existed, but has changed
      if (entity.key !== oldKey) {
        // we need to update queries touching both the old key and the new key
        modified |= oldKey | entity.key;

        // the entity has not yet been indexed
        if (!oldKey) {
          added.push(entity);
          this.index.append(entity.key, entity.id);
          continue;
        }

        // entities need to be removed from queries and unindexed whether or not they continue to exist
        removed.push(entity);
        this.index.remove(oldKey, entity.id);
        // ...but only bother re-indexing it if it's going to exist next tick.
        if (!Manager[ToDestroy][this.id].includes(entity)) {
          this.index.append(entity.key, entity.id);
          added.push(entity);
        }
      }
    }

    for (const query of Object.values(this.queries)) {
      // only update the query if its keys intersect with those we've modified
      if (query.key && match.any(modified, query.key)) {
        query.update(added, removed);
      }
    }

    for (const entity of removed) {
      delete this.entities[entity.id];
      this.index.remove(entity.key, entity.id);
      this.ctx.ids.id.release(entity.id);
    }

    // reset everything for the next tick
    Manager[ToDestroy][this.id] = [];
    Manager[ToIndex][this.id] = [];
  }

  /**
   * Return the bigint identifier of a component or tag.
   */
  public getID(...names: Identifier[]): bigint | null {
    return this.registry.getID(...names);
  }

  public stop(): void {
    this.queries = {};
    this.index = new EntityIndex();
    Manager[ToIndex][this.id] = [];
    Manager[ToDestroy][this.id] = [];
  }

  /**
   * Create an entity with a given constructor, optionally with entity data and a list of tags.
   * @returns the newly created entity
   */
  public create<T extends BaseType>(
    Entity: EntityClass<T>,
    data: BaseDataType<T> = {},
    tags: string[] = []
  ): Entity<T> {
    const entity = new Entity(this.ctx, data, tags);
    Manager[ToIndex][this.id].push([entity, entity.key ?? null]);
    this.entities[entity.id] = entity;
    return entity;
  }

  /**
   * Given an entity, return its bigint key (union of all components/tags)
   */
  protected getEntityKey(entity: Entity): bigint {
    const baseKey =
      // if this entity has a base key, use that instead of recomputing it
      this.baseEntityKeys.get(entity.constructor as EntityClass) ??
      this.registry.add(...entity[Components].map(e => e.type));

    if (entity.tags.size > 0) {
      // if we have tags, then get those too.
      const arr = Array.from(entity.tags, t => this.registrations.tags[t]);
      return union(baseKey, this.registry.add(...arr));
    }
    return baseKey;
  }

  // protected createEntityRefTag(entity: Entity): void {
  //   const tag = Symbol(`entity.${entity.id}`);
  //   const id = this.ctx.ids.id.next();
  //   this.registrations.refs[entity.id] = tag;
  //   this.registrations.tags[tag] = id;
  //   this.registry.add(id);
  // }

  public constructor(context: Context<$AnyEvil>) {
    this.ctx = context;
    this.id = this.ctx.ids.id.next();
    Manager[ToIndex][this.id] = [];
    Manager[ToDestroy][this.id] = [];
  }
}
