import type { ComponentClass, Entity } from '../ecs';
import type { Manager, Query } from '../lib';
import type {
  $AnyEvil,
  BaseType,
  KeyedByType,
  NeverByType,
  PartialByType,
  QueryStep
} from '../types';
import type { U } from 'ts-toolbelt';

import { QueryTag } from '../types';

interface BaseQueryBuilder2<T extends BaseType = {}> {
  get(): Entity<T>[];
  first(): Entity<T> | null;
  [Symbol.iterator](): Iterator<Entity<T>>;
  components: ComponentQueryBuilder<T>;
  tags: TagQueryBuilder<T>;
}

interface ComponentQueryBuilder<T extends BaseType = {}>
  extends ComponentQueryFns {
  <A extends ComponentClass[]>(...components: A): QueryBuilder2<
    U.Merge<T & KeyedByType<A>>
  >;
}

interface TagQueryBuilder<T extends BaseType = {}> extends TagQueryFns<T> {
  (...tags: string[]): QueryBuilder2<T>;
}

interface ComponentQueryFns<T extends BaseType = {}> {
  all<A extends ComponentClass[]>(
    ...components: A
  ): QueryBuilder2<U.Merge<T & KeyedByType<A>>>;
  any<A extends ComponentClass[]>(
    ...components: A
  ): QueryBuilder2<U.Merge<T & PartialByType<A>>>;
  some<A extends ComponentClass[]>(
    ...components: A
  ): QueryBuilder2<U.Merge<T & PartialByType<A>>>;
  none<A extends ComponentClass[]>(
    ...components: A
  ): QueryBuilder2<U.Merge<T & NeverByType<A>>>;
}

interface TagQueryFns<T extends BaseType = {}> {
  all(...tags: string[]): QueryBuilder2<T>;
  any(...tags: string[]): QueryBuilder2<T>;
  none(...tags: string[]): QueryBuilder2<T>;
  some(...tags: string[]): QueryBuilder2<T>;
}

export interface QueryState {
  tag: QueryTag | null;
  ids: string[];
}

export class QueryBuilder2<T extends BaseType = {}>
  implements BaseQueryBuilder2<T> {
  protected key: string = '';
  protected state!: QueryState;
  protected resolved: Query<T, Entity<T>> | null = null;
  protected criteria: QueryStep[] = [];
  protected manager: Manager;

  protected reset(): this {
    if (this.state) {
      this.key += '::' + this.state.tag + '|' + this.state.ids.join(',');
      this.criteria.push({
        tag: this.state.tag ?? QueryTag.ALL,
        ids: this.state.ids.slice()
      });
    }
    this.state = { tag: null, ids: [] };
    return this;
  }

  protected _tag(tag: QueryTag) {
    return (...items: string[]) => {
      for (let i = 0; i < items.length; i++) {
        const t = this.manager.getTagKey(items[i]);
        t && this.state.ids.push(t);
      }
      this.state.tag = tag;
      return this.reset();
    };
  }

  protected _component(tag: QueryTag) {
    return (...items: ComponentClass[]) => {
      this.state.ids.push(...items.map(item => item.type));
      this.state.tag = tag;
      return this.reset();
    };
  }

  protected handle: {
    components: ComponentQueryFns<T>;
    tags: TagQueryFns<T>;
  } = {
    components: ({
      all: this._component(QueryTag.ALL),
      any: this._component(QueryTag.ANY),
      some: this._component(QueryTag.SOME),
      none: this._component(QueryTag.NONE)
    } as $AnyEvil) as ComponentQueryFns<T>,
    tags: {
      all: this._tag(QueryTag.ALL),
      any: this._tag(QueryTag.ANY),
      some: this._tag(QueryTag.SOME),
      none: this._tag(QueryTag.NONE)
    }
  };

  public readonly components: ComponentQueryBuilder<T> = Object.assign(
    this.handle.components.all,
    this.handle.components
  );

  public readonly tags: TagQueryBuilder<T> = Object.assign(
    this.handle.tags.all,
    this.handle.tags
  );

  public get query(): Query<T> {
    return (this.resolved ??= this.manager.getQuery<T>(
      this.criteria,
      this.key
    ));
  }

  public get(): Entity<T>[] {
    return this.query.get();
  }

  public first(): Entity<T> | null {
    return this.query.first();
  }

  public *[Symbol.iterator](): Iterator<Entity<T>> {
    yield* this.query;
  }

  public constructor(manager: Manager) {
    this.manager = manager;
    this.reset();
  }
}
