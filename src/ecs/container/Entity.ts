import type { BaseType, KeyedByType, PartialBaseType } from '../../types';
import type { Component, ComponentClass } from '../contained/Component';
import type { Manager } from '../../lib';

import { Container } from '../../lib/Container';
import { useWith } from '../../utils';

export interface EntityClass<T extends BaseType<Component>> {
  with<T, A extends ComponentClass[]>(
    ...components: A
  ): EntityClass<T & KeyedByType<A>>;
  new (manager: Manager, data?: PartialBaseType<T>): Entity<T>;
}

export class Entity<T extends BaseType = {}> extends Container<T> {
  public static with<T, A extends ComponentClass[]>(
    ...components: A
  ): EntityClass<T & KeyedByType<A>> {
    return useWith<T & KeyedByType<A>, A>(this, ...components);
  }
}
