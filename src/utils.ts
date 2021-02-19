/* eslint-disable max-classes-per-file */
import type { BaseType, KeyedByType, OfOrArrayOf } from './types';
import type {
  ComponentClass,
  EntityClass,
  System,
  SystemClass,
  WorldClass
} from './ecs';
import { nanoid } from 'nanoid/non-secure';

export function* idGenerator(): IterableIterator<bigint> {
  let id = 1n;
  do {
    yield 1n << id++;
  } while (true);
}

export const id = (): (() => bigint) => {
  const gen = idGenerator();
  return (): bigint => gen.next().value;
};

/**
 * Helper function to create new container class constructors with typed `$`s.
 * @param Constructor - Constructor to extend.
 * @param items - array of containees; this will override existing `$`s
 */
export function useWithComponent<
  T extends BaseType,
  A extends OfOrArrayOf<ComponentClass>[] = []
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

export function union(...values: bigint[]): bigint {
  return values.reduce((a, b) => a | b, 0n);
}

export function intersect(...values: bigint[]): bigint {
  return values.reduce((a, b) => a & b, 0n);
}

export const match = {
  any(target: bigint, toMatch: bigint): boolean {
    return !target || (target & toMatch) > 0n;
  },
  all(target: bigint, toMatch: bigint): boolean {
    return (target & toMatch) === target;
  },
  none(target: bigint, toMatch: bigint): boolean {
    return !(toMatch & target);
  }
};
