/* eslint-disable max-classes-per-file */
import type { ContainedClass } from './Contained';

import type { QueryManager, QueryState } from '../managers/QueryManager';
import { QueryTag, QueryType } from '../managers/QueryManager';
import type { Contained, Container } from '..';
import type { ContainerClass } from './Container';
import { Mutation } from '../managers/ContainerManager';
import type { BaseType, KeyedByType, PartialByType } from '../types';
import type { U } from 'ts-toolbelt';

interface QueryBase<
  T extends BaseType = {},
  C extends Container<T> = Container<T>
> {
  ids(...ids: string[]): QueryBase<T, C>;
  entities<A extends ContainerClass>(
    EntityConstructor: A
  ): Query<{}, InstanceType<A>>;
  tags(...tags: string[]): QueryBase<T, C>;

  all: QueryAll<T, C>;
  any: QueryAny<T, C>;
  some: QueryAny<T, C>;
  get(): C[];
  first(): C | null;
}

interface QueryAll<
  T extends BaseType<Contained> = {},
  C extends Container<T> = Container<T>
> extends QueryBase<T, C> {
  components<A extends ContainedClass[]>(
    ...components: A
  ): Query<U.Merge<T & KeyedByType<A>>>;
  created: QueryAll<T, C>;
  changed: QueryAll<T, C>;
  removed: QueryAll<T, C>;
}

interface QueryNone<
  T extends BaseType<Contained> = {},
  C extends Container<T> = Container<T>
> extends QueryBase<T, C> {
  components<A extends ContainedClass[]>(...components: A): Query<T>;
  created: QueryNone<T, C>;
  changed: QueryNone<T, C>;
  removed: QueryNone<T, C>;
}

interface QueryAny<
  T extends BaseType<Contained> = {},
  C extends Container<T> = Container<T>
> extends QueryBase<T, C> {
  components<A extends ContainedClass[]>(
    ...components: A
  ): Query<U.Merge<T & PartialByType<A>>>;
  created: QueryAny<T, C>;
  changed: QueryAny<T, C>;
  removed: QueryAny<T, C>;
}

export class Query<
  T extends BaseType = {},
  C extends Container<T> = Container<T>
> implements QueryBase<T, C> {
  protected criteria: QueryState[] = [];
  protected state!: QueryState;
  protected manager: QueryManager;

  protected reset(): this {
    if (this.state) {
      this.criteria.push(this.state);
    }
    this.state = {
      // default to an "all" query
      tag: QueryTag.ALL,
      type: null,
      mutation: null,
      items: []
    };
    return this;
  }

  /** start: modify queries */

  public get all(): QueryAll<T, C> {
    this.state.tag = QueryTag.ALL;
    return (this as unknown) as QueryAll<T, C>;
  }

  public get any(): QueryAny<T, C> {
    this.state.tag = QueryTag.ANY;
    return (this as unknown) as QueryAny<T, C>;
  }

  public get some(): QueryAny<T, C> {
    this.state.tag = QueryTag.SOME;
    return (this as unknown) as QueryAny<T, C>;
  }

  public get none(): QueryNone<T, C> {
    this.state.tag = QueryTag.NONE;
    return (this as unknown) as QueryNone<T, C>;
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
  ): Query<{}, InstanceType<C>> {
    this.state.type = QueryType.CONTAINER;
    this.state.items.push(ContainerClass.id);
    return (this.reset() as unknown) as Query<{}, InstanceType<C>>;
  }

  public components<A extends ContainedClass[]>(
    ...components: A
  ): Query<U.Merge<T & KeyedByType<A>>> {
    this.state.type = QueryType.CONTAINED;
    this.state.items.push(...components.map(c => c.type));
    return (this.reset() as unknown) as Query<U.Merge<T & KeyedByType<A>>>;
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
