import type { ContainedClass } from './Contained';

import type { QueryManager, QueryState } from '../managers/QueryManager';
import { QueryTag, QueryType } from '../managers/QueryManager';
import type { Contained, Container } from '..';
import type { ContainerClass } from './Container';
import { Mutation } from '../managers/ContainerManager';
import type { BaseType, KeyedByType, PartialByType } from '../types';
import type { U } from 'ts-toolbelt';

interface BaseQuery<
  T extends BaseType = {},
  C extends Container<T> = Container<T>
> {
  get(): C[];
  first(): C | null;
  [Symbol.iterator](): Iterator<C>;
  all: QueryAll<T, C>;
  any: QueryAny<T, C>;
  some: QueryAny<T, C>;
  none: QueryNone<T, C>;
  changed: MutationQuery<T, C>;
  created: MutationQuery<T, C>;
  removed: MutationQuery<T, C>;
}

interface MutationQuery<
  T extends BaseType = {},
  C extends Container<T> = Container<T>
> extends QueryAll<T, C> {
  // modifiers
  all: QueryAll<T, C>;
  any: QueryAll<T, C>;
  none: QueryAll<T, C>;
  some: QueryAll<T, C>;
}

interface QueryNone<
  T extends BaseType<Contained> = {},
  C extends Container<T> = Container<T>
> {
  // no entities; not sure how best to handle this
  components<A extends ContainedClass[]>(...components: A): Query<T>;
  tags(...tags: string[]): BaseQuery<T, C>;
  ids(...ids: string[]): BaseQuery<T, C>;
}

interface QueryAll<
  T extends BaseType<Contained> = {},
  C extends Container<T> = Container<T>
> {
  // no ids; an entity cannot have multiple IDs
  // no entities; an entity cannot be an instance of multiple entity classes
  components<A extends ContainedClass[]>(
    ...components: A
  ): BaseQuery<U.Merge<T & KeyedByType<A>>>;
  tags(...tags: string[]): BaseQuery<T, C>;
}

interface QueryAny<
  T extends BaseType<Contained> = {},
  C extends Container<T> = Container<T>
> {
  entities<A extends ContainerClass>(
    EntityConstructor: A
  ): BaseQuery<{}, InstanceType<A>>;
  components<A extends ContainedClass[]>(
    ...components: A
  ): Query<U.Merge<T & PartialByType<A>>>;
  tags(...tags: string[]): BaseQuery<T, C>;
  ids(...ids: string[]): BaseQuery<T, C>;
}

export interface TempQueryState {
  type: QueryType | null;
  tag: QueryTag | null;
  items: string[];
  mutation: Mutation | null;
}

export class Query<
  T extends BaseType = {},
  C extends Container<T> = Container<T>
> implements BaseQuery<T, C> {
  protected criteria: QueryState[] = [];
  protected state!: TempQueryState;
  protected manager: QueryManager;

  protected reset(): this {
    if (this.state) {
      this.criteria.push({
        ...this.state,
        // default to an OR for mutations, an ALL for the rest
        tag:
          this.state.tag ?? (this.state.mutation ? QueryTag.ANY : QueryTag.ALL),
        // sort items now so we don't have to worry about string order for caching later
        items: this.state.items.sort((a, b) => a.localeCompare(b))
      });
    }

    this.state = { tag: null, type: null, mutation: null, items: [] };
    return this;
  }

  /**
   * Mark step values as mandatory.
   * A & B
   */
  public get all(): QueryAll<T, C> {
    this.state.tag = QueryTag.ALL;
    return (this as unknown) as QueryAll<T, C>;
  }

  /**
   * Mark step values as optional, with 1+ required matches.
   * A | B
   */
  public get any(): QueryAny<T, C> {
    this.state.tag = QueryTag.ANY;
    return (this as unknown) as QueryAny<T, C>;
  }

  /**
   * Mark step values as optional, with 0+ matches.
   * A? | B?
   */
  public get some(): QueryAny<T, C> {
    this.state.tag = QueryTag.SOME;
    return (this as unknown) as QueryAny<T, C>;
  }

  /**
   * Mark step values as disqualifying.
   * !(A & B)
   */
  public get none(): QueryNone<T, C> {
    this.state.tag = QueryTag.NONE;
    return (this as unknown) as QueryNone<T, C>;
  }

  /**
   * Filter to values updated within the current tick.
   */
  public get changed(): MutationQuery<T, C> {
    this.state.mutation = Mutation.CHANGED;
    return (this as unknown) as MutationQuery<T, C>;
  }

  /**
   * Filter to values created within the current tick.
   */
  public get created(): MutationQuery<T, C> {
    this.state.mutation = Mutation.CREATED;
    return (this as unknown) as MutationQuery<T, C>;
  }

  /**
   * Filter to values removed within the current tick.
   */
  public get removed(): MutationQuery<T, C> {
    this.state.mutation = Mutation.REMOVED;
    return (this as unknown) as MutationQuery<T, C>;
  }

  /**
   * Filter to a static list of IDs.
   */
  public ids(...ids: string[]): BaseQuery<T, C> {
    this.state.type = QueryType.ID;
    this.state.items.push(...ids);
    return this.reset();
  }

  /**
   * Create a new step with one or more tag requirements.
   */
  public tags<A extends string[]>(...tags: A): BaseQuery<T, C> {
    this.state.type = QueryType.TAG;
    this.state.items.push(...tags);
    return this.reset();
  }

  /**
   * Create a new step with a container class requirement.
   */
  public entities<C extends ContainerClass>(
    ContainerClass: C
  ): BaseQuery<{}, InstanceType<C>> {
    this.state.type = QueryType.CONTAINER;
    this.state.items.push(ContainerClass.id);
    return (this.reset() as unknown) as Query<{}, InstanceType<C>>;
  }

  /**
   * Create a new step with one or more container requirements.
   */
  public components<A extends ContainedClass[]>(
    ...components: A
  ): BaseQuery<U.Merge<T & KeyedByType<A>>> {
    this.state.type = QueryType.CONTAINED;
    this.state.items.push(...components.map(c => c.type));
    return (this.reset() as unknown) as Query<U.Merge<T & KeyedByType<A>>>;
  }

  /**
   * Return query results as an array.
   */
  public get(): C[] {
    return Array.from(this.manager.execute(this.criteria)) as C[];
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
    for (const item of this.manager.execute(this.criteria)) {
      yield item as C;
    }
  }

  public constructor(manager: QueryManager) {
    this.manager = manager;
    this.reset();
  }
}
