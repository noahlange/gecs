import type { ContainedClass, ContainerClass } from './lib';
import type { BaseType, KeyedByType } from './types';

/**
 * Helper function to create new container class constructors with typed `$`s.
 * @param Constructor - Constructor to extend.
 * @param items - array of containees; this will override existing `$`s
 */
export function useWith<T extends BaseType, A extends ContainedClass[] = []>(
  Constructor: ContainerClass<T>,
  ...items: A
): ContainerClass<T & KeyedByType<A>> {
  // type system abuse
  return (class extends Constructor {
    public get items(): A {
      return items;
    }
  } as unknown) as ContainerClass<T & KeyedByType<A>>;
}
