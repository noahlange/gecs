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

  public query(): QueryBuilder {
    return new QueryBuilder<{}>(this);
  }

  // would be nice to be able to pass this directly as a function.
  public tick = (delta: number, time?: number): void => {
    for (const system in this.$) {
      this.$[system].execute(delta, time);
    }
  };

  public init(): void {
    for (const system in this.$) {
      this.$[system].init();
    }
  }

  public readonly entities: Entity<{}>[] = [];
}
