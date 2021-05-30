/* eslint-disable max-classes-per-file */
import type {
  ComponentClass,
  ContextClass,
  Entity,
  EntityClass,
  SystemClass
} from './ecs';
import type { SystemFunction } from './ecs/System';
import type { BaseType, KeyedByType } from './types';

import { getID } from './ids';

export function isEntityClass(
  e: ComponentClass | EntityClass
): e is EntityClass {
  return !('type' in e);
}
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
    public static id = getID();
    public get items(): A {
      return items;
    }
  } as unknown) as EntityClass<T & KeyedByType<A>>;
}

export function useWithSystem<T>(
  Constructor: ContextClass<T>,
  ...items: (SystemClass<T> | SystemFunction<T>)[]
): ContextClass<T> {
  // type system abuse
  return class extends Constructor {
    public get items(): (SystemClass<T> | SystemFunction<T>)[] {
      return items;
    }
  };
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
    return !toMatch || !(toMatch & target);
  }
};

/**
 * Group entities by key.
 */
export function groupByKey(entities: Set<Entity>): Map<bigint, Entity[]> {
  return Array.from(entities).reduce((a, b) => {
    const arr = a.get(b.key) ?? [];
    arr.push(b);
    a.set(b.key, arr);
    return a;
  }, new Map<bigint, Entity[]>());
}

/**
 * Determine if a system-like function is the constructor of a stateful system
 * or simply a stateless function system.
 */
export function isSystemConstructor<T>(
  system: SystemClass<T> | SystemFunction<T>
): system is SystemClass<T> {
  return !!(
    system.prototype?.tick ??
    system.prototype?.stop ??
    system.prototype?.start
  );
}
