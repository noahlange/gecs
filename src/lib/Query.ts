import type { Manager } from '.';
import type {
  BaseType,
  KeyedByType,
  PartialByType,
  WithStaticType
} from '../types';
import type { ComponentClass } from '../ecs';
import type { Container } from './Container';
import type { U } from 'ts-toolbelt';
import type { ContainedClass } from './Contained';
import type { ContainerQueryOptions } from './Manager';

import { dedupe } from '../utils';

type QueryType<T, A extends WithStaticType[]> = Query<
  U.Merge<T & PartialByType<A>>
>;

const pass = <T>(a: T[]): T[] | null => (a.length ? dedupe(a) : null);

export class Query<
  T extends BaseType = {},
  C extends Container<T> = Container<T>
> {
  protected manager!: Manager;

  protected _includes: string[] = [];
  protected _excludes: string[] = [];
  protected _changed: string[] = [];
  protected _unchanged: string[] = [];
  protected _ids: string[] = [];

  protected get query(): ContainerQueryOptions {
    return {
      ids: pass(this._ids),
      includes: pass(this._includes),
      excludes: pass(this._excludes),
      changed: pass(this._changed),
      unchanged: pass(this._unchanged)
    };
  }

  /**
   * List required component types.
   * @param items
   */
  public with<A extends ContainedClass[]>(
    ...items: A
  ): Query<U.Merge<T & KeyedByType<A>>> {
    for (const { type } of items) {
      this._includes.push(type);
    }
    return (this as unknown) as QueryType<T, A>;
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
    return (this as unknown) as QueryType<T, A>;
  }

  /**
   * List excluded component types.
   * @param items
   */
  public without(...items: ComponentClass[]): this {
    for (const { type } of items) {
      this._excludes.push(type);
    }
    return this;
  }

  /**
   * List of containeds, one or more of which must have changed to return a container.
   * @alpha
   */
  public changed<A extends ContainedClass[]>(
    ...items: A
  ): Query<U.Merge<T & KeyedByType<A>>> {
    for (const { type } of items) {
      this._includes.push(type);
      this._changed.push(type);
    }
    return (this as unknown) as QueryType<T, A>;
  }

  /**
   * List components that must _not have changed.
   * @alpha
   */
  public unchanged<A extends ContainedClass[]>(
    ...items: A
  ): Query<U.Merge<T & PartialByType<A>>> {
    for (const { type } of items) {
      this._includes.push(type);
      this._unchanged.push(type);
    }
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
    this._ids.push(id);
    for (const item of this.manager.query(this.query)) {
      return item as C;
    }
    return null;
  }

  public findIn(ids: string[]): C[] {
    this._ids.push(...ids);
    return this.all();
  }

  public first(): C | null {
    for (const item of this) {
      return item;
    }
    return null;
  }

  public attach(manager: Manager): this {
    this.manager = manager;
    return this;
  }
}
