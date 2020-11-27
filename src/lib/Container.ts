/* eslint-disable max-classes-per-file */
import type { BaseType, KeyedByType } from '../types';
import type { ContainedClass } from './Contained';
import type { Manager } from './Manager';

import { nanoid } from 'nanoid';

export interface ContainerClass<T extends BaseType> {
  with<A extends ContainedClass[]>(
    ...items: A
  ): ContainerClass<T & KeyedByType<A>>;
  new (manager: Manager): Container<T>;
}

export class Container<T extends BaseType = BaseType> {
  public static with<
    A extends ContainedClass[],
    T extends BaseType = KeyedByType<A>
  >(...items: A): ContainerClass<T> {
    return class extends Container<T> {
      public items = items;
      public constructor(manager: Manager) {
        super();
        this.manager = manager;
        this.manager.add(this);
      }
    };
  }

  public get $(): T {
    return this.manager.bindContainer(this);
  }

  public id: string = nanoid();
  public items: ContainedClass[] = [];
  protected manager!: Manager;
}
