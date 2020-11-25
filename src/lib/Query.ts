import type { KeyedByType } from '../types';
import type { ComponentType } from './Component';
import type { Entity, EntityComponents } from './Entity';
import type { World } from './World';

export class QueryBuilder<T extends EntityComponents = {}> {
  protected _world: World<any>;
  protected _components: string[] = [];

  public has<A extends ComponentType<any>[]>(
    ...components: A
  ): QueryBuilder<T & KeyedByType<A>> {
    for (const C of components) {
      this._components.push(C.type);
    }
    return (this as unknown) as QueryBuilder<T & KeyedByType<A>>;
  }

  public all(): Entity<T>[] {
    return this._world.entities.filter(entity =>
      this._components.every(name => name in entity.components)
    ) as Entity<T>[];
  }

  public *[Symbol.iterator](): Iterator<Entity<T>> {
    for (const entity of this._world.entities) {
      if (this._components.every(name => name in entity.components)) {
        yield entity as Entity<T>;
      }
    }
  }

  public constructor(world: World<any>) {
    this._world = world;
  }
}
