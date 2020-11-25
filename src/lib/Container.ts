import type {
  ContainedType,
  ContainerType,
  KeyedByType,
  ManagerType
} from '../types';

type ContainedItems = ContainedType[] & { id: string };

export class Container<T> {
  public static _contained: ContainedItems;

  protected static _with<A extends ContainedType[], T = {}>(
    ...items: A
  ): ContainerType<T & KeyedByType<A>> {
    this._contained =
      // each class type needs its own instance of the `_contained` array,
      // otherwise they'll all share Container's `_contained`.
      !this._contained || this.name !== this._contained.id
        ? Object.assign(items, { id: this.name })
        : (this._contained.concat(items) as ContainedItems);

    return (this as any) as ContainerType<T & KeyedByType<A>>;
  }

  protected _items!: T;
  public manager!: ManagerType<T>;

  public constructor() {
    this._items = (this.constructor as typeof Container)._contained.reduce(
      (carry, C) => ({ ...carry, [C.type]: new C(this) }),
      {} as T
    );
  }
}
