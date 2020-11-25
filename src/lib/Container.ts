import type { ContainedType, KeyedByType } from '../types';
import { id } from '../utils';

type ContainedItems = ContainedType[] & { id: string };

export interface ContainerType<T> {
  new (): Container<T>;
}

export class Container<T> {
  protected static $: ContainedItems;
  protected static _with<A extends ContainedType[], T = {}>(
    ...items: A
  ): ContainerType<T & KeyedByType<A>> {
    this.$ =
      // each class type needs its own instance of the `_contained` array,
      // otherwise they'll all share Container's `_contained`.
      !this.$ || this.name !== this.$.id
        ? Object.assign(items, { id: this.name })
        : (this.$.concat(items) as ContainedItems);

    return (this as any) as ContainerType<T & KeyedByType<A>>;
  }

  public readonly id = id();
  public readonly $: T;

  public constructor() {
    this.$ = (this.constructor as typeof Container).$.reduce(
      (carry, C) => ({ ...carry, [C.type]: new C(this) }),
      {} as T
    );
  }
}
