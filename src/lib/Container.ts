import type { BaseType, KeyedByType, WithStaticType } from '../types';

import { nanoid } from 'nanoid/non-secure';
import { Manager } from './Manager';
import { useWith } from '../utils';

export interface ContainerClass<T extends BaseType = {}> {
  with<A extends WithStaticType[], T extends BaseType = {}>(
    ...items: A
  ): ContainerClass<T & KeyedByType<A>>;
  new (manager: Manager): Container<T>;
}

export class Container<T extends BaseType = {}> {
  public static with<T, A extends WithStaticType[]>(
    ...items: A
  ): ContainerClass<T & KeyedByType<A>> {
    return useWith<T & KeyedByType<A>, A>(this, ...items);
  }

  public id: string = nanoid();

  public get manager(): Manager {
    if (!this._manager) {
      console.warn(
        `No external containee manager exists for container instance of type "${this.constructor.name}". Creating internal manager.`
      );
      this._manager = new Manager();
      this._manager.add(this);
    }
    return this._manager;
  }

  public get items(): WithStaticType[] {
    return [];
  }

  protected _manager?: Manager;

  public init?(): void;

  public destroy(): void {
    this.manager.destroy(this.id);
  }

  public get $(): T {
    return this.manager.bind(this);
  }

  public constructor(manager: Manager) {
    if (manager) {
      this._manager = manager;
      this._manager.add(this);
    }
  }
}
