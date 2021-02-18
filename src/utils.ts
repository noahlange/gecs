/* eslint-disable max-classes-per-file */
import type { BaseType, KeyedByType } from './types';
import type {
  ComponentClass,
  EntityClass,
  System,
  SystemClass,
  WorldClass
} from './ecs';
import { nanoid } from 'nanoid';

/**
 * Helper function to create new container class constructors with typed `$`s.
 * @param Constructor - Constructor to extend.
 * @param items - array of containees; this will override existing `$`s
 */
export function useWithComponent<
  T extends BaseType,
  A extends ComponentClass[] = []
>(Constructor: EntityClass<T>, ...items: A): EntityClass<T & KeyedByType<A>> {
  // type system abuse
  return (class extends Constructor {
    public static id = nanoid(8);
    public get items(): A {
      return items;
    }
  } as unknown) as EntityClass<T & KeyedByType<A>>;
}

export function useWithSystem<
  T extends BaseType<System>,
  A extends SystemClass[] = []
>(Constructor: WorldClass<T>, ...items: A): WorldClass<T & KeyedByType<A>> {
  // type system abuse
  return (class extends Constructor {
    public get items(): A {
      return items;
    }
  } as unknown) as WorldClass<T & KeyedByType<A>>;
}

export function difference<T>(...sets: T[][]): T[] {
  const results = new Set(sets.shift());
  for (const result of results) {
    for (const set of sets) {
      if (set.includes(result)) {
        results.delete(result);
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

export function intersection<T>(...arrays: T[][]): T[] {
  const results = arrays.shift() ?? [];
  const out = [];
  loop: for (const result of results) {
    for (const array of arrays) {
      if (array.indexOf(result) === -1) {
        continue loop;
      }
    }
    out.push(result);
  }
  return out;
}
