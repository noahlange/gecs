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

import { getID, setID } from './ids';

export function isEntityClass(
  e: ComponentClass | EntityClass
): e is EntityClass {
  return !('type' in e);
}

const ctors: Map<EntityClass, ComponentClass[]> = new Map();

/**
 * Helper function to create new container class constructors with typed `$`s.
 * @param Constructor - Constructor to extend.
 * @param items - array of containees; this will extend existing `$`s
 */
export function useWithComponent<
  T extends BaseType,
  A extends ComponentClass[] = []
>(Constructor: EntityClass<T>, ...items: A): EntityClass<T & KeyedByType<A>> {
  // we're tracking entity class => component classes, allowing us to extend existing component sets.
  const curr = ctors.get(Constructor) ?? [];
  // we need to give each entity its own constructor
  const _a = class extends Constructor {};

  // and we need to define this here because no other configuration permits
  // `items` to be accessible on the prototype while being not being subject to
  // changes in other items of the same type (via `.slice()` in the entity constructor)
  const value = [...curr, ...items];
  ctors.set(_a, value);

  Object.defineProperty(_a.prototype, 'items', {
    value: value.slice(),
    writable: true
  });

  // type system abuse
  return (_a as unknown) as EntityClass<T & KeyedByType<A>>;
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
  let res: bigint = 0n;
  for (const val of values) {
    res |= val;
  }
  return res;
}

export function intersect(...values: bigint[]): bigint {
  let res: bigint = 0n;
  for (const val of values) {
    res &= val;
  }
  return res;
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

export { getID, setID };
