import type {
  BaseType,
  KeyedByType,
  PartialBaseType,
  Serialized
} from '../types';
import type { System, SystemClass } from './System';
import type { Entity, EntityClass } from './Entity';
import type { Component, ComponentClass } from './Component';

import { EntityManager, QueryManager } from '../managers';
import { QueryBuilder } from '../lib';
import { useWithSystem, isEntityClass } from '../utils';
import { anonymous } from '../types';
import { Deserializer } from '../lib/Deserializer';
import { Serializer } from '../lib/Serializer';

export interface WorldClass<T extends BaseType<System> = {}> {
  data?: PartialBaseType<T>;
  with<A extends SystemClass[], T extends BaseType<System> = {}>(
    ...items: A
  ): WorldClass<T & KeyedByType<A>>;
  new (): World;
}

interface Constructors {
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
  protected manager: EntityManager = new EntityManager();
  protected queries: QueryManager = new QueryManager(this.manager);

  public constructors: Constructors = {
    entities: {},
    components: {}
  };

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
        this.constructors.entities[key] = item;
      } else {
        this.constructors.components[item.type] = item;
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
