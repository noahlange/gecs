import type { BaseDataType, BaseType, Serialized } from '../types';
import type { Component, ComponentClass } from './Component';
import type { Entity, EntityClass } from './Entity';
import type { System, SystemClass, SystemFunction } from './System';

import { Deserializer, Manager, QueryBuilder, Serializer } from '../lib';
import { anonymous } from '../types';
import { isEntityClass, useWithSystem } from '../utils';
import { sequence } from './composers';

export interface ContextClass<T> {
  with(...items: SystemClass<T>[]): ContextClass<T>;
  new (state?: T): Context<T>;
}

interface Registrations {
  entities: Record<string, EntityClass>;
  components: Record<string, ComponentClass>;
}

export class Context<T extends {} = {}> {
  public static with<T extends {}>(
    ...systems: (SystemClass<T> | SystemFunction<T>)[]
  ): ContextClass<T> {
    return useWithSystem<T>(this, ...systems);
  }

  protected pipeline: System<T>;
  // binary semaphore to prevent overlapping tick() calls
  protected locked: boolean = false;

  public state: T;
  public registrations: Registrations = { entities: {}, components: {} };
  public manager: Manager = new Manager();

  public get items(): (SystemClass<T> | SystemFunction<T>)[] {
    return [];
  }

  /**
   * Custom setup logic to be implemented as deemed necessary.
   */
  public init?(): Promise<void> | void;

  public async tick(delta: number, time: number): Promise<void> {
    if (!this.locked) {
      this.locked = true;
      await this.pipeline.tick?.(delta, time);
      this.locked = false;
    } else {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Tick duration exceeds tick rate.');
      }
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
   * Kickstart the Context and its systems.
   */
  public async start(): Promise<void> {
    await this.pipeline.start?.();
    this.manager.tick();
    await this.tick(0, 0);
  }

  public async stop(): Promise<void> {
    await this.pipeline.stop?.();
  }

  public create<C extends BaseType<Component>>(
    EntityConstructor: EntityClass<C>,
    data: BaseDataType<C> = {},
    tags: string[] = []
  ): Entity<C> {
    return this.manager.create(EntityConstructor, data, tags);
  }

  public get $(): QueryBuilder {
    return new QueryBuilder(this.manager);
  }

  public constructor(state?: T) {
    // using the React approach of "define it in the class or pass it in or it'll be null"
    this.state = (state ?? null)!;
    const Pipeline = sequence(...this.items);
    this.pipeline = new Pipeline(this);
  }
}
