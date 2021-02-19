import type { BaseType, KeyedByType, PartialBaseType } from '../types';
import type { System, SystemClass } from './System';
import type { Entity, EntityClass } from './Entity';
import type { Component, ComponentClass } from './Component';

import { useWithSystem } from '../utils';
import { EntityManager } from '../managers';
import { QueryBuilder } from '../lib';

export interface WorldClass<T extends BaseType<System> = {}> {
  data?: PartialBaseType<T>;
  with<A extends SystemClass[], T extends BaseType<System> = {}>(
    ...items: A
  ): WorldClass<T & KeyedByType<A>>;
  new (): World;
}

export class World<T extends BaseType<System> = {}> {
  public static with<T, A extends SystemClass[]>(
    ...systems: A
  ): WorldClass<T & KeyedByType<A>> {
    return useWithSystem<T & KeyedByType<A>, A>(this, ...systems);
  }

  protected systems: System[] = [];
  protected manager: EntityManager = new EntityManager();

  public get items(): SystemClass[] {
    return [];
  }

  /**
   * Custom setup logic to be implemented as deemed necessary.
   */
  public init?(): Promise<void> | void;

  public tick(delta: number, time: number): void {
    for (const system of this.systems) {
      system.tick?.(delta, time);
    }
    this.manager.cleanup();
  }

  public register(...items: (ComponentClass | EntityClass)[]): void {
    this.manager.register(...items);
  }

  /**
   * Kickstart the world and its systems.
   */
  public async start(): Promise<void> {
    this.init?.();
    for (const System of this.items) {
      this.systems.push(new System(this));
    }
    for (const system of this.systems) {
      await system.init?.();
      this.manager.queries.update();
    }
  }

  public create<C extends BaseType<Component>>(
    EntityConstructor: EntityClass<C>,
    data: PartialBaseType<C> = {},
    tags: string[] = []
  ): Entity<C> {
    return this.manager.create(EntityConstructor, data, tags);
  }

  public get query(): QueryBuilder {
    return new QueryBuilder(this.manager, this.manager.queries);
  }

  public $: T;

  public constructor() {
    this.$ = {} as T;
    for (const System of this.items) {
      if (System.type) {
        this.$[System.type as keyof T] = new System(this) as T[keyof T];
      } else {
        console.warn(`Attempted to register unnamed system "${System.name}."`);
      }
    }
  }
}
