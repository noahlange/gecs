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

function sort(set: Set<string>): string[] | null {
  return set.size
    ? Array.from(set.values()).sort((a, b) => a.localeCompare(b))
    : null;
}

type QueryCondition =
  | 'typeID'
  | 'includes'
  | 'excludes'
  | 'changed'
  | 'created'
  | 'removed';

interface QueryState {
  typeID: string | null;
  includes: Set<string>;
  excludes: Set<string>;
  changed: Set<string>;
  created: Set<string>;
  removed: Set<string>;
}
export class Query<
  T extends BaseType = {},
  C extends Container<T> = Container<T>
> {
  protected manager!: QueryManager;

  protected ids: Set<string> = new Set();
  protected q: QueryState = {
    typeID: null,
    includes: new Set(),
    excludes: new Set(),
    changed: new Set(),
    created: new Set(),
    removed: new Set()
  };

  protected get query(): QueryOptions {
    return {
      typeID: this.q.typeID ?? null,
      ids: sort(this.ids),
      includes: sort(this.q.includes),
      excludes: sort(this.q.excludes),
      changed: sort(this.q.changed),
      created: sort(this.q.created),
      removed: sort(this.q.removed)
    };
  }

  protected add(
    Constructors: ContainedClass[],
    conditions: QueryCondition[]
  ): void {
    for (const { type, name } of Constructors) {
      if (!type) {
        console.warn(`Attempted to query unnamed contained type "${name}."`);
      } else {
        for (const condition of conditions) {
          if (condition !== 'typeID') {
            this.q[condition] = this.q[condition].add(type);
          }
        }
      }
    }
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
    this.add(items, ['includes']);
    return (this as unknown) as QueryType<T, A>;
  }

  /**
   * List excluded component types.
   * @param items
   */
  public without(...items: ComponentClass[]): this {
    this.add(items, ['excludes']);
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
    this.add(items, ['includes', 'changed']);
    return (this as unknown) as QueryType<T, A>;
  }

  /**
   * List components that have been recently created.
   * @alpha
   */
  public created<A extends ContainedClass[]>(
    ...items: A
  ): Query<U.Merge<T & KeyedByType<A>>> {
    this.add(items, ['includes', 'created']);
    return (this as unknown) as QueryType<T, A>;
  }

  public *[Symbol.iterator](): Iterator<C> {
    for (const entity of this.manager.query(this.query)) {
      // type system abuse
      yield entity as C;
    }
  }

  public all(): C[] {
    return Array.from(this);
  }

  public find(id: string): C | null {
    this.ids.add(id);
    for (const item of this.manager.query(this.query)) {
      return item as C;
    }
    return null;
  }

  public findIn(ids: string[]): C[] {
    for (const id of ids) {
      this.ids.add(id);
    }
    return this.all();
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
