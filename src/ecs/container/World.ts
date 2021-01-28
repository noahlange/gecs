import type { BaseType, KeyedByType, PartialBaseType } from '../../types';
import type { System, SystemClass } from '../contained/System';
import type { Component } from '../contained/Component';
import type { EntityClass } from './Entity';

import { useWith } from '../../utils';
import { Container } from '../../lib/Container';
import { Manager } from '../../lib/Manager';
import { Query } from '../../lib/Query';

export interface WorldClass<T extends BaseType<System>> {
  with<A extends SystemClass[], T = {}>(
    ...systems: A
  ): WorldClass<T & KeyedByType<A>>;
  new (): World<T>;
}

export class World<T extends BaseType<System> = {}> extends Container<T> {
  public static with<A extends SystemClass[], T = {}>(
    ...systems: A
  ): WorldClass<T & KeyedByType<A>> {
    // type system abuse
    return useWith<T & KeyedByType<A>, A>(this, ...systems) as WorldClass<
      T & KeyedByType<A>
    >;
  }

  public get query(): Query<{}> {
    return new Query<{}>().attach(this.entities);
  }

  public search<T extends BaseType, C extends Container<T>>(
    query: Query<T, C>
  ): Query<T, C> {
    return query.attach(this.entities);
  }

  /**
   * Given a construtor and (optionally) data, instantiate a new Entity.
   */
  public create<T extends BaseType<Component>>(
    Constructor: EntityClass<T>,
    data?: PartialBaseType<T>
  ): Container<T> {
    return this.entities.create(Constructor, data);
  }

  public tick(delta: number, time?: number): void {
    for (const key in this.$$) {
      this.$$[key].tick?.(delta, time);
    }
  }

  /**
   * Custom setup logic to be implemented as deemed necessary.
   */
  public init?(): void;

  /**
   * Kickstart the world and its systems.
   */
  public start(): void {
    for (const system in this.$$) {
      const s = this.$$[system];
      const systems = Array.isArray(s) ? s : [s];
      for (const system of systems) {
        system.init?.();
      }
    }
  }

  public entities = new Manager();
}
