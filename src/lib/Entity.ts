import type { Component, ComponentType } from './Component';
import type { KeyedByType } from '../types';

import { Container } from './Container';

export interface EntityType<T extends EntityComponents = {}> {
  with<A extends ComponentType<T>[]>(
    ...components: A
  ): EntityType<T & KeyedByType<A>>;
  new (): Entity<T>;
}

export interface EntityComponents {
  [key: string]: Component;
}

export class Entity<T extends EntityComponents = {}> extends Container<T> {
  public static _components: ComponentType<any>[] & { id: string };

  public static with<A extends ComponentType<T>[], T = {}>(
    ...items: A
  ): EntityType<T & KeyedByType<A>> {
    return super._with(...items) as EntityType<T & KeyedByType<A>>;
  }

  public get components(): T {
    return this._items;
  }
}
