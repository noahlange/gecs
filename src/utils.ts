import type { ContainedClass, ContainerClass } from './lib';
import type { BaseType, KeyedByType } from './types';

import { nanoid } from 'nanoid/non-secure';
import intersection from 'fast_array_intersect';

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
    public static id = nanoid(8);
    public get items(): A {
      return items;
    }
  } as unknown) as ContainerClass<T & KeyedByType<A>>;
}

export function difference<T>(...sets: T[][]): T[] {
  const first = sets.shift();
  const results = new Set<T>(first);
  for (const value of results) {
    for (const set of sets) {
      if (set?.indexOf(value) > -1) {
        results.delete(value);
        break;
      }
    }
  }
  return Array.from(results);
}

export function union<T>(...sets: T[][]): T[] {
  const results = [];
  for (const set of sets) {
    results.push(...set);
  }
  return Array.from(new Set(results));
}

export { intersection };
