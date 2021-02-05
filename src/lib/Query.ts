import type {
  BaseType,
  KeyedByType,
  PartialByType,
  WithStaticType
} from '../types';
import type { ComponentClass } from '../ecs';
import type { Container, ContainerClass } from './Container';
import type { U } from 'ts-toolbelt';
import type { ContainedClass } from './Contained';
import type { QueryManager, QueryOptions } from '../managers/QueryManager';

type QueryType<T, A extends WithStaticType[]> = Query<
  U.Merge<T & PartialByType<A>>
>;

interface QueryState {
  typeID: string | null;
  includes: string[];
  excludes: string[];
  tagIncludes: string[];
  tagExcludes: string[];
  changed: string[];
  created: string[];
  removed: string[];
}
export class Query<
  T extends BaseType = {},
  C extends Container<T> = Container<T>
> {
  protected manager!: QueryManager;

  protected ids: Set<string> = new Set();
  protected q: QueryState = {
    typeID: null,
    includes: [],
    excludes: [],
    tagIncludes: [],
    tagExcludes: [],
    changed: [],
    created: [],
    removed: []
  };

  protected get query(): QueryOptions {
    return {
      typeID: this.q.typeID ?? null,
      ids: Array.from(this.ids),
      includes: this.q.includes,
      excludes: this.q.excludes,
      tagIncludes: this.q.tagIncludes,
      tagExcludes: this.q.tagExcludes,
      changed: this.q.changed,
      created: this.q.created,
      removed: this.q.removed
    };
  }

  public ofType<C extends ContainerClass>(
    ContainerClass: C
  ): Query<{}, InstanceType<C>> {
    this.q.typeID = ContainerClass.id;
    return (this as unknown) as Query<{}, InstanceType<C>>;
  }

  /**
   * List required component types.
   * @param items
   */
  public with<A extends ContainedClass[]>(
    ...items: A
  ): Query<U.Merge<T & KeyedByType<A>>> {
    for (const { type } of items) {
      this.q.includes.push(type);
    }
    return (this as unknown) as QueryType<T, A>;
  }

  /**
   * List excluded component types.
   * @param items
   */
  public without(...items: ComponentClass[]): this {
    for (const { type } of items) {
      this.q.excludes.push(type);
    }
    return this;
  }

  public withTag(...tags: string[]): this {
    for (const tag of tags) {
      this.q.tagIncludes.push(tag);
    }
    return this;
  }

  public withoutTag(...tags: string[]): this {
    for (const tag of tags) {
      this.q.tagExcludes.push(tag);
    }
    return this;
  }

  /**
   * List optional contained types.
   * @param items
   *
   * @privateRemarks
   * this doesn't actually do anything other than modifying the query type
   */
  public some<A extends ContainedClass[]>(
    ...items: A
  ): Query<U.Merge<T & PartialByType<A>>> {
    // no-op
    return (this as unknown) as QueryType<T, A>;
  }

  /**
   * List of containeds, one or more of which must have changed to return a container.
   * @alpha
   */
  public changed<A extends ContainedClass[]>(
    ...items: A
  ): Query<U.Merge<T & KeyedByType<A>>> {
    for (const { type } of items) {
      this.q.includes.push(type);
      this.q.changed.push(type);
    }
    return (this as unknown) as QueryType<T, A>;
  }

  /**
   * List components that have been recently created.
   * @alpha
   */
  public created<A extends ContainedClass[]>(
    ...items: A
  ): Query<U.Merge<T & KeyedByType<A>>> {
    for (const { type } of items) {
      this.q.includes.push(type);
      this.q.created.push(type);
    }
    return (this as unknown) as QueryType<T, A>;
  }

  public *[Symbol.iterator](): Iterator<C> {
    for (const entity of this.manager.query(this.query)) {
      // type system abuse
      yield entity as C;
    }
  }

  public find(id: string): C | null {
    this.ids.add(id);
    for (const item of this.manager.query(this.query)) {
      if (item) {
        return item as C;
      }
    }
    return null;
  }

  public get(): C[] {
    return this.manager.query(this.query) as C[];
  }

  public findIn(ids: string[]): C[] {
    for (const id of ids) {
      this.ids.add(id);
    }
    return this.get();
  }

  public first(): C | null {
    for (const item of this) {
      return item;
    }
    return null;
  }

  public constructor(manager: QueryManager) {
    this.manager = manager;
  }
}
