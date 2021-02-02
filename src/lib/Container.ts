import type { BaseType, KeyedByType, WithStaticType, Frozen } from '../types';
import type { ContainerManager } from '../managers/ContainerManager';

import { nanoid } from 'nanoid/non-secure';
import { useWith } from '../utils';

export interface ContainerClass<T extends BaseType = {}> {
  with<A extends WithStaticType[], T extends BaseType = {}>(
    ...items: A
  ): ContainerClass<T & KeyedByType<A>>;
  new (): Container<T>;
}

export class Container<T extends BaseType = {}> {
  /**
   * Return a container constructor bound to the given contained constructors.
   *
   * @param items - array of contained types
   */
  public static with<T, A extends WithStaticType[]>(
    ...items: A
  ): ContainerClass<T & KeyedByType<A>> {
    return useWith<T & KeyedByType<A>, A>(this, ...items);
  }

  /**
   * Unique container identifier.
   */
  public readonly id: string = nanoid(8);

  /**
   * Manager of contained items.
   *
   * @privateRemarks
   * This is defined at runtime with `Object.defineProperty()` to avoid embedding
   * a reference to the manager directly into the object.
   */
  public readonly manager!: ContainerManager;

  /**
   * Array of constituent constructors.
   *
   * @privateRemarks
   * Defined indirectly using the static `with()` method.
   */
  public get items(): WithStaticType[] {
    return [];
  }

  /**
   * Return an object of immutable components.
   */
  public get $(): Frozen<T> {
    return this.manager.getBindings(this, false) as Frozen<T>;
  }

  /**
   * Return an object of mutable components.
   */
  public get $$(): T {
    return this.manager.getBindings(this, true);
  }

  /**
   * Optionally-implemented initializer method.
   * @todo - is this invoked anywhere?
   */
  public init?(): void;

  public destroy(): void {
    this.manager.destroy(this.id);
  }
}
