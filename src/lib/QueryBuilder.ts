import type { Component, ComponentClass, Entity, EntityClass } from '../ecs';
import type { Manager } from '../lib';
import type { BaseType, KeyedByType, PartialByType, QueryStep } from '../types';
import type { Query } from './Query';
import type { U } from 'ts-toolbelt';

import { QueryTag } from '../types';

interface BaseQueryBuilder<
  T extends BaseType = {},
  C extends Entity<T> = Entity<T>
> extends QueryBuilderAll {
  get(): C[];
  first(): C | null;
  find(): C;
  persist(): Query<T>;
  [Symbol.iterator](): Iterator<C>;
  all: QueryBuilderAll<T, C>;
  any: QueryBuilderAny<T, C>;
  some: QueryBuilderAny<T, C>;
  none: QueryBuilderNone<T, C>;
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
  tag: QueryTag | null;
  ids: string[];
}

export class QueryBuilder<
  T extends BaseType = {},
  C extends Entity<T> = Entity<T>
> implements BaseQueryBuilder<T, C> {
  protected key: string = '';

  protected state!: TempQueryBuilderState;
  protected criteria: QueryStep[] = [];
  protected manager: Manager;

  protected reset(): this {
    if (this.state) {
      this.key += '::' + this.state.tag + '|' + this.state.ids.join(',');
      this.criteria.push({
        tag: this.state.tag ?? QueryTag.ALL,
        ids: this.state.ids
      });
    }
    this.state = { tag: null, ids: [] };
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
   * Create a new step with one or more tag requirements.
   */
  public tags<A extends string[]>(...tags: A): BaseQueryBuilder<T, C> {
    for (let i = 0; i < tags.length; i++) {
      const t = this.manager.getTagKey(tags[i]);
      t && this.state.ids.push(t);
    }
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
    return (this.reset() as unknown) as BaseQueryBuilder<
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
    yield* this.query;
  }

  public get query(): Query<T, C> {
    return this.manager.getQuery<T, C>(this.criteria, this.key);
  }

  public constructor(entities: Manager) {
    this.manager = entities;
    this.reset();
  }
}
