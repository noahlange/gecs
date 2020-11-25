import type { KeyedByType } from '../types';
import type { ComponentType } from './Component';
import type { Entity, EntityComponents } from './Entity';
import type { World } from './World';

export class QueryBuilder<T extends EntityComponents = {}> {
  protected world: World<any>;
  protected $: string[] = [];

  public has<A extends ComponentType<unknown>[]>(
    ...components: A
  ): QueryBuilder<T & KeyedByType<A>> {
    for (const C of components) {
      this.$.push(C.type);
    }
    return (this as unknown) as QueryBuilder<T & KeyedByType<A>>;
  }

  public *[Symbol.iterator](): Iterator<Entity<T>> {
    for (const entity of this.world.entities) {
      if (this.$.every(name => name in entity.$)) {
        yield entity as Entity<T>;
      }
    }
  }

  public all(): Entity<T>[] {
    return Array.from(this);
  }

  public constructor(world: World<any>) {
    this.world = world;
  }
}
