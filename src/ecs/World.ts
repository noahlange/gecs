import type { BaseDataType, BaseType, KeyedByType, Serialized } from '../types';
import type { Component, ComponentClass } from './Component';
import type { Entity, EntityClass } from './Entity';
import type { System, SystemClass } from './System';

import { Manager, QueryBuilder } from '../lib';
import { Deserializer } from '../lib/Deserializer';
import { Serializer } from '../lib/Serializer';
import { anonymous } from '../types';
import { isEntityClass, useWithSystem } from '../utils';

export interface WorldClass<T extends BaseType<System> = {}> {
  data?: BaseDataType<T>;
  with<A extends SystemClass[], T extends BaseType<System> = {}>(
    ...items: A
  ): WorldClass<T & KeyedByType<A>>;
  new (): World;
}

interface Registrations {
  entities: Record<string, EntityClass>;
  components: Record<string, ComponentClass>;
}

export class World<T extends BaseType<System> = {}> {
  public static with<T, A extends SystemClass[]>(
    ...systems: A
  ): WorldClass<T & KeyedByType<A>> {
    return useWithSystem<T & KeyedByType<A>, A>(this, ...systems);
  }

  protected systems: System[] = [];
  protected manager: Manager = new Manager();

  public registrations: Registrations = { entities: {}, components: {} };

  public get items(): SystemClass[] {
    return [];
  }

  /**
   * Custom setup logic to be implemented as deemed necessary.
   */
  public init?(): Promise<void> | void;

  public tick(delta: number, time: number): void {
    this.manager.tick();
    for (const system of this.systems) {
      system.tick?.(delta, time);
      this.manager.tick();
    }
  }

  public load(save: Serialized): void {
    const d = new Deserializer(this);
    d.deserialize(save);
    this.manager.tick();
  }

  public save(): Serialized {
    const s = new Serializer(this.manager);
    return s.serialize();
  }

  public register(...items: (ComponentClass | EntityClass)[]): void {
    for (const item of items) {
      if (isEntityClass(item)) {
        const key =
          item.name === anonymous
            ? (item.prototype.items as ComponentClass[])
                .map(e => e.type)
                .join('|')
            : item.name;
        this.registrations.entities[key] = item;
      } else {
        this.registrations.components[item.type] = item;
      }
    }
    this.manager.register(...items);
  }

  /**
   * Kickstart the world and its systems.
   */
  public async start(): Promise<void> {
    await this.init?.();
    for (const System of this.items) {
      this.systems.push(new System(this));
    }
    for (const system of this.systems) {
      await system.init?.();
      this.manager.tick();
    }
    this.tick(0, 0);
  }

  public create<C extends BaseType<Component>>(
    EntityConstructor: EntityClass<C>,
    data: BaseDataType<C> = {},
    tags: string[] = []
  ): Entity<C> {
    return this.manager.create(EntityConstructor, data, tags);
  }

  public get query(): QueryBuilder {
    return new QueryBuilder(this.manager);
  }

  public $: T;

  public constructor() {
    this.$ = {} as T;
    for (const System of this.items) {
      this.$[System.type as keyof T] = new System(this) as T[keyof T];
    }
  }
}
