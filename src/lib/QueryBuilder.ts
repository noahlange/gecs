import type { Component, ComponentClass, Entity, EntityClass } from '../ecs';
import type { BaseType, KeyedByType, PartialByType, QueryStep } from '../types';
import type { QueryManager } from './QueryManager';
import type { U } from 'ts-toolbelt';

import { QueryTag, QueryType } from '../types';
import type { EntityManager } from '.';

interface BaseQueryBuilder<
  T extends BaseType = {},
  C extends Entity<T> = Entity<T>
> {
  get(): C[];
  first(): C | null;
  [Symbol.iterator](): Iterator<C>;
  all: QueryBuilderAll<T, C>;
  any: QueryBuilderAny<T, C>;
  some: QueryBuilderAny<T, C>;
  none: QueryBuilderNone<T, C>;
  created: MutationQueryBuilder<T, C>;
  removed: MutationQueryBuilder<T, C>;
}

interface MutationQueryBuilder<
  T extends BaseType = {},
  C extends Entity<T> = Entity<T>
> extends QueryBuilderAll<T, C> {
  // modifiers
  all: QueryBuilderAll<T, C>;
  any: QueryBuilderAll<T, C>;
  none: QueryBuilderAll<T, C>;
  some: QueryBuilderAll<T, C>;
}

interface QueryBuilderNone<
  T extends BaseType<Component> = {},
  C extends Entity<T> = Entity<T>
> {
  // no entities; not sure how best to handle this
  components<A extends ComponentClass[]>(...components: A): QueryBuilder<T>;
  tags(...tags: string[]): BaseQueryBuilder<T, C>;
  ids(...ids: string[]): BaseQueryBuilder<T, C>;
}

interface QueryBuilderAll<
  T extends BaseType<Component> = {},
  C extends Entity<T> = Entity<T>
> {
  // no ids; an entity cannot have multiple IDs
  // no entities; an entity cannot be an instance of multiple entity classes
  components<A extends ComponentClass[]>(
    ...components: A
  ): BaseQueryBuilder<U.Merge<T & KeyedByType<A>>>;
  tags(...tags: string[]): BaseQueryBuilder<T, C>;
}

interface QueryBuilderAny<
  T extends BaseType<Component> = {},
  C extends Entity<T> = Entity<T>
> {
  entities<A extends EntityClass>(
    EntityConstructor: A
  ): BaseQueryBuilder<{}, InstanceType<A>>;
  components<A extends ComponentClass[]>(
    ...components: A
  ): QueryBuilder<U.Merge<T & PartialByType<A>>>;
  tags(...tags: string[]): BaseQueryBuilder<T, C>;
  ids(...ids: string[]): BaseQueryBuilder<T, C>;
}

export interface TempQueryBuilderState {
  type: QueryType | null;
  tag: QueryTag | null;
  items: (number | string)[];
}

export class QueryBuilder<
  T extends BaseType = {},
  C extends Entity<T> = Entity<T>
> implements BaseQueryBuilder<T, C> {
  protected state!: TempQueryBuilderState;
  protected criteria: QueryStep[] = [];
  protected queryManager: QueryManager;
  protected entityManager: EntityManager;

  protected reset(): this {
    if (this.state) {
      const type = this.state.type ?? QueryType.COMPONENT;
      const step = {
        ...this.state,
        // default to an OR for mutations, an ALL for the rest
        tag: this.state.tag ?? QueryTag.ALL,
        // sort items now so we don't have to worry about string order for caching later
        type,
        items: this.state.items.map(item => item.toString())
      };
      this.criteria.push({
        ...step,
        key: `${step.type}:${step.tag}:${step.items.join(',')}`
      });
    }

    this.state = { tag: null, type: null, items: [] };
    return this;
  }

  /**
   * Mark step values as mandatory.
   * A & B
   */
  public get all(): QueryBuilderAll<T, C> {
    this.state.tag = QueryTag.ALL;
    return (this as unknown) as QueryBuilderAll<T, C>;
  }

  /**
   * Mark step values as optional, with 1+ required matches.
   * A | B
   */
  public get any(): QueryBuilderAny<T, C> {
    this.state.tag = QueryTag.ANY;
    return (this as unknown) as QueryBuilderAny<T, C>;
  }

  /**
   * Mark step values as optional, with 0+ matches.
   * A? | B?
   */
  public get some(): QueryBuilderAny<T, C> {
    this.state.tag = QueryTag.SOME;
    return (this as unknown) as QueryBuilderAny<T, C>;
  }

  /**
   * Mark step values as disqualifying.
   * !(A & B)
   */
  public get none(): QueryBuilderNone<T, C> {
    this.state.tag = QueryTag.NONE;
    return (this as unknown) as QueryBuilderNone<T, C>;
  }

  /**
   * Filter to values created within the current tick.
   */
  public get created(): MutationQueryBuilder<T, C> {
    // this.state.mutation = Mutation.CREATED;
    return (this as unknown) as MutationQueryBuilder<T, C>;
  }

  /**
   * Filter to values removed within the current tick.
   */
  public get removed(): MutationQueryBuilder<T, C> {
    // this.state.mutation = Mutation.REMOVED;
    return (this as unknown) as MutationQueryBuilder<T, C>;
  }

  /**
   * Filter to a static list of IDs.
   */
  public ids(...ids: string[]): BaseQueryBuilder<T, C> {
    this.state.type = QueryType.ID;
    this.state.items.push(...ids);
    return this.reset();
  }

  /**
   * Create a new step with one or more tag requirements.
   */
  public tags<A extends string[]>(...tags: A): BaseQueryBuilder<T, C> {
    this.state.type = QueryType.TAG;
    this.state.items.push(...tags);
    return this.reset();
  }

  /**
   * Create a new step with a container class requirement.
   */
  public entities<C extends EntityClass>(
    EntityConstructor: C
  ): BaseQueryBuilder<{}, InstanceType<C>> {
    this.state.type = QueryType.ENTITY;
    this.state.items.push(EntityConstructor.id);
    return (this.reset() as unknown) as QueryBuilder<{}, InstanceType<C>>;
  }

  /**
   * Create a new step with one or more container requirements.
   */
  public components<A extends ComponentClass[]>(
    ...components: A
  ): BaseQueryBuilder<U.Merge<T & KeyedByType<A>>> {
    this.state.type = QueryType.COMPONENT;
    this.state.items.push(...components.map(c => c.type));
    return (this.reset() as unknown) as QueryBuilder<
      U.Merge<T & KeyedByType<A>>
    >;
  }

  /**
   * Return query results as an array.
   */
  public get(): C[] {
    return this.queryManager.execute(this.criteria) as C[];
  }

  /**
   * Return the first search result.
   */
  public first(): C | null {
    for (const item of this) {
      return item as C;
    }
    return null;
  }

  /**
   * Iterate through search results.
   */
  public *[Symbol.iterator](): Iterator<C> {
    for (const item of this.queryManager.execute(this.criteria)) {
      yield item as C;
    }
  }

  public constructor(entities: EntityManager, manager: QueryManager) {
    this.entityManager = entities;
    this.queryManager = manager;
    this.reset();
  }
}
