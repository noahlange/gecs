/* eslint-disable max-classes-per-file */
import type { ContainedClass } from './Contained';

import type { QueryManager, QueryState } from '../managers/QueryManager';
import { QueryTag, QueryType } from '../managers/QueryManager';
import type { Contained, Container } from '..';
import type { ContainerClass } from './Container';
import { Mutation } from '../managers/ContainerManager';
import type { BaseType, KeyedByType, PartialByType } from '../types';
import type { U } from 'ts-toolbelt';

interface QueryBuilderBase<
  T extends BaseType = {},
  C extends Container<T> = Container<T>
> {
  ids(...ids: string[]): QueryBuilderBase<T, C>;
  entities<A extends ContainerClass>(
    EntityConstructor: A
  ): QueryBuilder<{}, InstanceType<A>>;
  tags(...tags: string[]): QueryBuilderBase<T, C>;

  all: QueryBuilderAll<T, C>;
  any: QueryBuilderAny<T, C>;
  get(): C[];
  first(): C | null;
}

interface QueryBuilderAll<
  T extends BaseType<Contained> = {},
  C extends Container<T> = Container<T>
> extends QueryBuilderBase<T, C> {
  components<A extends ContainedClass[]>(
    ...components: A
  ): QueryBuilder<U.Merge<T & KeyedByType<A>>>;
}

interface QueryBuilderAny<
  T extends BaseType<Contained> = {},
  C extends Container<T> = Container<T>
> extends QueryBuilderBase<T, C> {
  components<A extends ContainedClass[]>(
    ...components: A
  ): QueryBuilder<U.Merge<T & PartialByType<A>>>;
}

export class QueryBuilder<
  T extends BaseType = {},
  C extends Container<T> = Container<T>
> implements QueryBuilderBase<T, C> {
  protected criteria: QueryState[] = [];
  protected state!: QueryState;
  protected manager: QueryManager;

  protected reset(): this {
    if (this.state) {
      this.criteria.push(this.state);
    }
    this.state = {
      type: null,
      mutation: null,
      // default to an "all" query
      tag: QueryTag.AND,
      items: []
    };
    return this;
  }

  /** start: modify queries */

  public get all(): QueryBuilderAll<T, C> {
    this.state.tag = QueryTag.AND;
    return (this as unknown) as QueryBuilderAll<T, C>;
  }

  public get any(): QueryBuilderAny<T, C> {
    this.state.tag = QueryTag.OR;
    return (this as unknown) as QueryBuilderAny<T, C>;
  }

  // doesn't need to be typed if it isn't there.
  public get none(): this {
    this.state.tag = QueryTag.NONE;
    return this;
  }

  public get changed(): this {
    this.state.mutation = Mutation.CHANGED;
    return this;
  }

  public get created(): this {
    this.state.mutation = Mutation.CREATED;
    return this;
  }

  public get removed(): this {
    this.state.mutation = Mutation.REMOVED;
    return this;
  }

  public id(id: string): this {
    this.state.type = QueryType.ID;
    this.state.items.push(id);
    return this.reset();
  }

  public ids(...ids: string[]): this {
    this.state.type = QueryType.ID;
    this.state.items.push(...ids);
    return this.reset();
  }
  /** end: modify queries */

  public tags<A extends string[]>(...tags: A): this {
    this.state.type = QueryType.TAG;
    this.state.items.push(...tags);
    return this.reset();
  }

  public entities<C extends ContainerClass>(
    ContainerClass: C
  ): QueryBuilder<{}, InstanceType<C>> {
    this.state.type = QueryType.CONTAINER;
    this.state.items.push(ContainerClass.id);
    return (this.reset() as unknown) as QueryBuilder<{}, InstanceType<C>>;
  }

  public components<A extends ContainedClass[]>(
    ...components: A
  ): QueryBuilder<U.Merge<T & KeyedByType<A>>> {
    this.state.type = QueryType.CONTAINED;
    this.state.items.push(...components.map(c => c.type));
    return (this.reset() as unknown) as QueryBuilder<
      U.Merge<T & KeyedByType<A>>
    >;
  }

  public get(): C[] {
    return Array.from(this.manager.execute(this.criteria)) as C[];
  }

  public first(): C | null {
    for (const item of this) {
      return item as C;
    }
    return null;
  }

  public *[Symbol.iterator](): Iterator<C> {
    for (const item of this.manager.execute(this.criteria)) {
      yield item as C;
    }
  }

  public constructor(manager: QueryManager) {
    this.manager = manager;
    this.reset();
  }
}
