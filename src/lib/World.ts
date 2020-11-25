import type { SystemType } from './System';
import type { KeyedByType } from '../types';

import { QueryBuilder } from './Query';
import type { Entity } from './Entity';
import { Container } from './Container';
import type { System } from './System';

export interface WorldType<T extends WorldSystems = {}> {
  with<A extends SystemType[]>(...items: A): WorldType<T & KeyedByType<A>>;
  new (): World<T>;
}

export interface WorldSystems {
  [key: string]: System;
}

export class World<T extends WorldSystems = {}> extends Container<T> {
  public static with<A extends SystemType[], T = {}>(
    ...items: A
  ): WorldType<T & KeyedByType<A>> {
    return super._with(...items) as WorldType<T & KeyedByType<A>>;
  }

  public get systems(): T {
    return this._items;
  }

  public query(): QueryBuilder {
    return new QueryBuilder<{}>(this);
  }

  public init(): void {
    for (const system in this._items) {
      this._items[system].init();
    }
  }

  public readonly entities: Entity<{}>[] = [];
}
