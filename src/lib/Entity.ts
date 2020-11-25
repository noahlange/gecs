import type { Component, ComponentType } from './Component';
import type { KeyedByType } from '../types';

import { Container } from './Container';

export interface EntityType<T extends EntityComponents = {}> {
  from<I extends Entity<Partial<T>>, O = this>(entity: I): O;
  with<A extends ComponentType<T>[]>(
    ...components: A
  ): EntityType<T & KeyedByType<A>>;
  new (): Entity<T>;
}

export interface EntityComponents {
  [key: string]: Component | undefined;
}

export class Entity<T extends EntityComponents = {}> extends Container<T> {
  public static with<A extends ComponentType<T>[], T = {}>(
    ...items: A
  ): EntityType<T & KeyedByType<A>> {
    return (super._with(...items) as any) as EntityType<T & KeyedByType<A>>;
  }

  public get components(): T {
    return this.$;
  }
}
