import type { ComponentClass, Context, Entity } from '../ecs';
import type {
  BaseType,
  Identifier,
  KeyedByType,
  PartialByType,
  QueryStep
} from '../types';
import type { Query } from '.';
import type { U } from 'ts-toolbelt';

import { Constraint } from '../types';

/**
 * A query without a qualified constraint is assumed to be "all"
 */
export interface QueryBuilderBase<T extends BaseType = {}>
  extends QueryBuilderAll<T> {
  all: QueryBuilderAll<T>;
  any: QueryBuilderAny<T>;
  some: QueryBuilderAny<T>;
  none: QueryBuilderBase<T>;
  get(): Entity<T>[];
  first(): Entity<T> | null;
  references(...entities: Entity<{}>[]): this;
  [Symbol.iterator](): Iterator<Entity<T>>;
}

interface QueryBuilderAll<T extends BaseType = {}> {
  components<A extends ComponentClass[]>(
    ...components: A
  ): QueryBuilder<U.Merge<T & KeyedByType<A>>>;
  tags(...tags: string[]): QueryBuilder<T>;
}

interface QueryBuilderAny<T extends BaseType = {}> {
  components<A extends ComponentClass[]>(
    ...components: A
  ): QueryBuilder<U.Merge<T & PartialByType<A>>>;
  tags(...tags: string[]): QueryBuilder<T>;
}

export interface QueryState {
  tag: Constraint | null;
  ids: Identifier[];
}

export class QueryBuilder<T extends BaseType = {}>
  implements QueryBuilderBase<T>
{
  protected key: string = '';
  protected state!: QueryState;
  protected resolved: Query<T> | null = null;
  protected criteria: QueryStep[] = [];
  protected ctx: Context;

  /**
   * Mark query parameters as mandatory.
   * A & B
   */
  public get all(): QueryBuilderAll<T> {
    this.state.tag = Constraint.ALL;
    return this as unknown as QueryBuilderAll<T>;
  }
  /**
   * Mark query parameters as optional, with 1+ required matches.
   * A | B
   */
  public get any(): QueryBuilderAny<T> {
    this.state.tag = Constraint.ANY;
    return this as unknown as QueryBuilderAny<T>;
  }

  /**
   * Mark query parameters as optional, with 0+ matches.
   * A? | B?
   */
  public get some(): QueryBuilderAny<T> {
    this.state.tag = Constraint.SOME;
    return this as unknown as QueryBuilderAny<T>;
  }

  /**
   * Mark query parameters as disqualifying.
   * !(A & B)
   */
  public get none(): this {
    this.state.tag = Constraint.NONE;
    return this;
  }

  /**
   * Constrain results to those referencing one of several entities.
   */
  public references(...entities: Entity[]): this {
    this.state.tag = Constraint.IN;
    this.state.ids = entities.map(entity => entity.id);
    return this.reset();
  }

  /**
   * Constrain results based on one or components.
   */
  public components<A extends ComponentClass[]>(
    ...components: A
  ): QueryBuilder<U.Merge<T & KeyedByType<A>>> {
    this.state.ids.push(...components.map(c => c.type));
    return this.reset() as unknown as QueryBuilder<U.Merge<T & KeyedByType<A>>>;
  }

  /**
   * Constrain results based on one or more tags.
   */
  public tags(...items: string[]): this {
    const tags = this.ctx.manager.registrations.tags;
    const filtered = items.filter(t => !tags[t]);
    if (filtered.length) {
      this.ctx.manager.register([], [], filtered);
    }

    this.state.ids = items.map(i => tags[i]);
    return this.reset();
  }

  public get query(): Query<T, Entity<T>> {
    return (this.resolved ??= this.ctx.manager.getQuery<T, Entity<T>>(
      this.criteria,
      this.key
    ));
  }

  /**
   * Return query results as an array.
   */
  public get(): Entity<T>[] {
    return this.query.get();
  }

  /**
   * Return the first query result.
   */
  public first(): Entity<T> | null {
    return this.query.first();
  }

  /**
   * Iterate through query results.
   */
  public [Symbol.iterator](): Iterator<Entity<T>> {
    return this.query[Symbol.iterator]();
  }

  protected reset(): this {
    if (this.state) {
      this.key += this.state.tag + '␞' + this.state.ids.join('␟') + '␝';
      this.criteria.push({
        constraint: this.state.tag ?? Constraint.ALL,
        ids: this.state.ids.slice()
      });
    }
    this.state = { tag: null, ids: [] };
    return this;
  }

  public constructor(ctx: Context) {
    this.ctx = ctx;
    this.reset();
  }
}
