import type { BaseType, KeyedByType, PartialBaseType } from '../../types';
import type { System, SystemClass } from '../contained/System';
import type { Component } from '../contained/Component';
import type { EntityClass } from './Entity';

import { useWith } from '../../utils';
import { Container } from '../../lib/Container';
import { ContainerManager } from '../../managers/ContainerManager';
import type { Query } from '../../lib/Query';

export interface WorldClass<T extends BaseType<System>> {
  id: string;
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
    return this.entities.query;
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
    for (const system of this.items) {
      this.$$[system.type].tick?.(delta, time);
    }
    this.manager.cleanup();
    this.entities.cleanup();
  }

  /**
   * Custom setup logic to be implemented as deemed necessary.
   */
  public init?(): Promise<void> | void;

  /**
   * Kickstart the world and its systems.
   */
  public async start(): Promise<void> {
    await this.init?.();
    for (const system of this.items) {
      await this.$$[system.type]?.init?.();
    }
  }

  public entities = new ContainerManager();

  public constructor() {
    super();
    const systems = new ContainerManager();
    systems.add(this);
  }
}
