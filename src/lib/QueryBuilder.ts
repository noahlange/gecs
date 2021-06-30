import type { ComponentClass, Entity } from '../ecs';
import type {
  $AnyEvil,
  BaseType,
  KeyedByType,
  NeverByType,
  PartialByType,
  QueryStep
} from '../types';
import type { Manager, Query } from '.';
import type { U } from 'ts-toolbelt';

import { Constraint } from '../types';

export interface BaseQueryBuilder<
  T extends BaseType = {},
  C extends Entity<T> = Entity<T>
> {
  get(): Entity<T>[];
  first(): Entity<T> | null;
  [Symbol.iterator](): Iterator<Entity<T>>;
  components: ComponentQueryBuilder<T, C>;
  tags: TagQueryBuilder<T, C>;
}

interface ComponentQueryBuilder<
  T extends BaseType = {},
  C extends Entity<T> = Entity<T>
> extends ComponentQueryFns<T, C> {
  <A extends ComponentClass[]>(...components: A): QueryBuilder<
    U.Merge<T & KeyedByType<A>>,
    C & Entity<U.Merge<T & KeyedByType<A>>>
  >;
}

interface TagQueryBuilder<
  T extends BaseType = {},
  C extends Entity<T> = Entity<T>
> extends TagQueryFns<T, C> {
  (...tags: string[]): QueryBuilder<T, C>;
}

interface ComponentQueryFns<
  T extends BaseType = {},
  C extends Entity<T> = Entity<T>
> {
  all<A extends ComponentClass[]>(
    ...components: A
  ): QueryBuilder<
    U.Merge<T & KeyedByType<A>>,
    C & Entity<U.Merge<T & KeyedByType<A>>>
  >;
  any<A extends ComponentClass[]>(
    ...components: A
  ): QueryBuilder<
    U.Merge<T & PartialByType<A>>,
    C & Entity<U.Merge<T & KeyedByType<A>>>
  >;
  some<A extends ComponentClass[]>(
    ...components: A
  ): QueryBuilder<
    U.Merge<T & PartialByType<A>>,
    C & Entity<U.Merge<T & KeyedByType<A>>>
  >;
  none<A extends ComponentClass[]>(
    ...components: A
  ): QueryBuilder<
    U.Merge<T & NeverByType<A>>,
    C & Entity<U.Merge<T & KeyedByType<A>>>
  >;
}

interface TagQueryFns<
  T extends BaseType = {},
  C extends Entity<T> = Entity<T>
> {
  all(...tags: string[]): QueryBuilder<T, C>;
  any(...tags: string[]): QueryBuilder<T, C>;
  none(...tags: string[]): QueryBuilder<T, C>;
  some(...tags: string[]): QueryBuilder<T, C>;
}

export interface QueryState {
  tag: Constraint | null;
  ids: string[];
}

export class QueryBuilder<
  T extends BaseType = {},
  C extends Entity<T> = Entity<T>
> implements BaseQueryBuilder<T> {
  protected key: string = '';
  protected state!: QueryState;
  protected resolved: Query<T, C> | null = null;
  protected criteria: QueryStep[] = [];
  protected manager: Manager;

  protected reset(): this {
    if (this.state) {
      this.key += this.state.tag + '|' + this.state.ids.join(',') + '::';
      this.criteria.push({
        constraint: this.state.tag ?? Constraint.ALL,
        ids: this.state.ids.slice()
      });
    }
    this.state = { tag: null, ids: [] };
    return this;
  }

  protected tag(tag: Constraint) {
    return (...items: string[]) => {
      for (let i = 0; i < items.length; i++) {
        const t = this.manager.getTagKey(items[i]);
        t && this.state.ids.push(t);
      }
      this.state.tag = tag;
      return this.reset();
    };
  }

  protected component(tag: Constraint) {
    return (...items: ComponentClass[]) => {
      this.state.ids.push(...items.map(item => item.type));
      this.state.tag = tag;
      return this.reset();
    };
  }

  protected handle: {
    components: ComponentQueryFns<T, C>;
    tags: TagQueryFns<T, C>;
  } = {
    components: ({
      all: this.component(Constraint.ALL),
      any: this.component(Constraint.ANY),
      some: this.component(Constraint.SOME),
      none: this.component(Constraint.NONE)
    } as $AnyEvil) as ComponentQueryFns<T, C>,
    tags: {
      all: this.tag(Constraint.ALL),
      any: this.tag(Constraint.ANY),
      some: this.tag(Constraint.SOME),
      none: this.tag(Constraint.NONE)
    }
  };

  public readonly components: ComponentQueryBuilder<T, C> = Object.assign(
    this.handle.components.all,
    this.handle.components
  );

  public readonly tags: TagQueryBuilder<T, C> = Object.assign(
    this.handle.tags.all,
    this.handle.tags
  );

  public get query(): Query<T, C> {
    return (this.resolved ??= this.manager.getQuery<T, C>(
      this.criteria,
      this.key
    ));
  }

  public get(): C[] {
    return this.query.get();
  }

  public first(): C | null {
    return this.query.first();
  }

  public *[Symbol.iterator](): Iterator<C> {
    yield* this.query;
  }

  public constructor(manager: Manager) {
    this.manager = manager;
    this.reset();
  }
}
