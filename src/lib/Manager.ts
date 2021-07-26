import type { ComponentClass, Entity, EntityClass } from '../ecs';
import type { BaseDataType, BaseType, QueryStep } from '../types';

import { anonymous } from '../types';
import { getID, match } from '../utils';
import { EntityIndex } from './EntityIndex';
import { Query } from './Query';
import { QueryBuilder } from './QueryBuilder';
import { Registry } from './Registry';

interface Registrations {
  entities: Record<string, EntityClass>;
  components: Record<string, ComponentClass>;
  tags: Record<string, string>;
}

export class Manager {
  /**
   * Map tags and components to bigints for bitmask searches.
   */
  protected registry = new Registry();

  /**
   * Cached queries, indexed by string key (basically a concatenation of query components).
   */
  protected queries: Record<string, Query> = {};

  /**
   * A mapping of tag literals to tag IDs. These IDs are mapped in turn to bigints for querying.
   */
  public registrations: Registrations = {
    tags: {},
    entities: {},
    components: {}
  };

  /**
   * A set of entities marked for destruction by the end of a system tick—these
   * entities will be stricken from queries during the manager's tick() method.
   */
  protected toDestroy: Set<Entity> = new Set();

  /**
   * A map of Entity -> key. Queries with modified entries are updated at the
   * end of each system tick. We're tracking the current key to filter out
   * entities that haven't actually changed—a entity with a tag that's been
   * removed and re-added, for example.
   */
  protected toIndex: Map<Entity, bigint> = new Map();

  /**
   * Maps bigint identifiers to result sets.
   */
  public index = new EntityIndex();

  /**
   * Return a new QueryBuilder instance.
   */
  public get $(): QueryBuilder {
    return new QueryBuilder(this);
  }

  /**
   * Given an entity, return its bigint key (union of all components/tags)
   */
  protected getEntityKey(entity: Entity): bigint {
    const tags = this.registrations.tags;
    const arr = Array.from(entity.tags).map(t => tags[t]);
    return this.registry.add(...entity.items.map(e => e.type), ...arr);
  }

  /**
   * Given an array of query steps (or a string ID mapping to a combination of
   * components/tags, if we're dealing with a persisted query) return a new
   * (or cached) query object.
   */
  public getQuery<
    T extends BaseType = BaseType,
    E extends Entity<T> = Entity<T>
  >(steps: QueryStep[], id: string): Query<T, E> {
    if (!this.queries[id]) {
      this.queries[id] = new Query(this, steps);
    }
    return this.queries[id] as Query<T, E>;
  }

  public register(
    entities: EntityClass[],
    components: ComponentClass[],
    tags: string[]
  ): void {
    const regs = this.registrations;

    for (const entity of entities) {
      const key =
        entity.name === anonymous
          ? (entity.prototype.items as ComponentClass[])
              .map(e => e.type)
              .join('|')
          : entity.name;
      regs.entities[key] = entity;
    }

    for (const component of components) {
      regs.components[component.type] = component;
    }

    for (const tag of tags) {
      regs.tags[tag] = getID();
    }

    this.registry.add(
      ...components.map(c => c.type),
      ...tags.map(t => regs.tags[t])
    );
  }

  /**
   * Indicate that we've modified the entity; index the current key to ensure that/how it's changed at the end of the
   * tick so we can pare down the list of queries we need to update.
   */
  public indexEntity(entity: Entity): void {
    this.toIndex.set(entity, entity.key ?? null);
  }

  /**
   * Determine which items need to be added to queries, removed from queries or destroyed.
   */
  public tick(): void {
    const added: Entity[] = [];
    const removed: Entity[] = Array.from(this.toDestroy);

    // get the union of every id modified over the course of the last tick
    let modified = 0n;

    for (const [entity, oldKey] of this.toIndex) {
      entity.key = this.getEntityKey(entity);

      // the entry existed, but has changed
      if (entity.key !== oldKey) {
        // we need to update queries touching both the old key and the new key
        modified |= oldKey | entity.key;

        // the entity has not yet been indexed
        if (!oldKey) {
          added.push(entity);
          this.index.append(entity.key, entity);
          continue;
        }

        // entities need to be removed from queries and unindexed whether or not they continue to exist
        removed.push(entity), this.index.remove(oldKey, entity);
        // ...but only bother re-indexing it if it's going to exist next tick.
        if (!this.toDestroy.has(entity)) {
          this.index.append(entity.key, entity);
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

    // reset everything for the next tick
    this.toIndex.clear(), this.toDestroy.clear();
  }

  /**
   * Return the bigint identifier of a component or tag.
   */
  public getID(...names: string[]): bigint | null {
    return this.registry.getID(...names);
  }

  /**
   * Mark an entity for destruction and removal at the system tick's end.
   */
  public destroy(entity: Entity): void {
    this.toDestroy.add(entity);
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
    const entity = new Entity(this, data, tags);
    this.indexEntity(entity);
    return entity;
  }
}
