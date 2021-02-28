import type { Component, ComponentClass, Entity, EntityClass } from '../ecs';
import type { BaseType, KeyedByType, PartialByType, QueryStep } from '../types';
import type { QueryManager, EntityManager } from '../managers';
import type { U } from 'ts-toolbelt';
import type { Query } from './Query';

import { QueryTag } from '../types';
import { Mutation } from '../types';

interface BaseQueryBuilder<
  T extends BaseType = {},
  C extends Entity<T> = Entity<T>
> {
  get(): C[];
  first(): C | null;
  find(): C;
  persist(): Query<T>;
  [Symbol.iterator](): Iterator<C>;
  all: QueryBuilderAll<T, C>;
  any: QueryBuilderAny<T, C>;
  some: QueryBuilderAny<T, C>;
  none: QueryBuilderNone<T, C>;
  added: MutationQueryBuilder<T, C>;
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
}

interface QueryBuilderAll<
  T extends BaseType<Component> = {},
  C extends Entity<T> = Entity<T>
> {
  components<A extends ComponentClass[]>(
    ...components: A
  ): BaseQueryBuilder<U.Merge<T & KeyedByType<A>>>;
  tags(...tags: string[]): BaseQueryBuilder<T, C>;
}

interface QueryBuilderAny<
  T extends BaseType<Component> = {},
  C extends Entity<T> = Entity<T>
> {
  entities<T extends BaseType, E extends Entity<T>>(
    EntityConstructor: EntityClass<T>
  ): BaseQueryBuilder<T, E>;
  components<A extends ComponentClass[]>(
    ...components: A
  ): QueryBuilder<U.Merge<T & PartialByType<A>>>;
  tags(...tags: string[]): BaseQueryBuilder<T, C>;
}

export interface TempQueryBuilderState {
  mutation: Mutation;
  tag: QueryTag | null;
  ids: (number | string)[];
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
      const step = {
        ...this.state,
        // default to an OR for mutations, an ALL for the rest
        tag: this.state.tag ?? QueryTag.ALL,
        // sort items now so we don't have to worry about string order for caching later
        ids: this.state.ids.map(item => item.toString())
      };
      this.criteria.push({
        ...step,
        key: `${step.tag}|${step.mutation}|${step.ids.join(',')}`
      });
    }

    this.state = { tag: null, ids: [], mutation: Mutation.NONE };
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
  public get added(): MutationQueryBuilder<T, C> {
    this.state.mutation = Mutation.ADDED;
    return (this as unknown) as MutationQueryBuilder<T, C>;
  }

  /**
   * Filter to values removed within the current tick.
   */
  public get removed(): MutationQueryBuilder<T, C> {
    this.state.mutation = Mutation.REMOVED;
    return (this as unknown) as MutationQueryBuilder<T, C>;
  }

  /**
   * Create a new step with one or more tag requirements.
   */
  public tags<A extends string[]>(...tags: A): BaseQueryBuilder<T, C> {
    const mapped = tags
      .map(t => this.entityManager.getTagKey(t))
      .filter(f => !!f);
    this.state.ids.push(...mapped);
    return this.reset();
  }

  /**
   * Constrain results to instances of an entity.
   */
  public entities<T extends BaseType, E extends Entity<T>>(
    EntityConstructor: EntityClass<T>
  ): BaseQueryBuilder<T, E> {
    this.state.ids.push(EntityConstructor.id);
    return (this.reset() as unknown) as BaseQueryBuilder<T, E>;
  }

  /**
   * Constrain results to those with given components.
   */
  public components<A extends ComponentClass[]>(
    ...components: A
  ): BaseQueryBuilder<U.Merge<T & KeyedByType<A>>> {
    this.state.ids.push(...components.map(c => c.type));
    return (this.reset() as unknown) as QueryBuilder<
      U.Merge<T & KeyedByType<A>>
    >;
  }

  /**
   * Return query results as an array.
   */
  public get(): C[] {
    return this.query.get();
  }

  /**
   * Return the first search result, throwing if no results are found.
   */
  public find(): C {
    return this.query.find();
  }

  /**
   * Return the first search result.
   */
  public first(): C | null {
    return this.query.first();
  }

  /**
   * Returns a handle on the query object to avoid query rebuilds.
   */
  public persist(): Query<T> {
    return this.query;
  }

  /**
   * Iterate through search results.
   */
  public *[Symbol.iterator](): Iterator<C> {
    for (const item of this.query) {
      yield item as C;
    }
  }

  public get query(): Query<T, C> {
    return this.queryManager.getQuery<T, C>(this.criteria);
  }

  public constructor(entities: EntityManager, manager: QueryManager) {
    this.entityManager = entities;
    this.queryManager = manager;
    this.reset();
  }
}
