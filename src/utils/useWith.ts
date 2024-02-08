/* eslint-disable max-classes-per-file */

import type { ComponentClass, ContextClass, EntityClass } from '../ecs';
import type { PluginClass } from '../lib/Plugin';
import type { BaseType, KeyedByType, Merge } from '../types';

import { Context } from '../ecs';
import { Components } from '../types';

const ctors: Map<EntityClass, ComponentClass[]> = new Map();

/**
 * Helper function to create new container class constructors with typed `$`s.
 * @param Constructor - Constructor to extend.
 * @param items - array of containees; this will extend existing `$`s
 */
export function useWithComponent<T extends BaseType, A extends ComponentClass[] = []>(
  Constructor: EntityClass<T>,
  ...items: A
): EntityClass<T & KeyedByType<A>> {
  // we're tracking entity class => component classes, allowing us to extend existing component sets.
  const curr = ctors.get(Constructor) ?? [];
  // we need to give each entity its own constructor
  const __entity = class extends Constructor {};

  // and we need to define this here because no other configuration permits
  // `items` to be accessible on the prototype while being not being subject to
  // changes in other items of the same type (via `.slice()` in the entity constructor)
  const value = [...curr, ...items];
  ctors.set(__entity, value);

  Object.defineProperty(__entity.prototype, Components, {
    value: value.slice(),
    writable: true
  });

  // type system abuse
  return __entity as unknown as EntityClass<T & KeyedByType<A>>;
}

export function useWithPlugins<P extends PluginClass<R>[], R extends KeyedByType<P>>(
  ...items: P
): ContextClass<Merge<R>> {
  const __ctx = class extends Context<Merge<R>> {};
  Object.defineProperty(__ctx.prototype, 'items', {
    value: items.slice(),
    writable: true
  });
  return __ctx as unknown as ContextClass<Merge<R>>;
}
