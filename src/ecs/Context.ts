import type { Component, ComponentClass, Entity, EntityClass, Plugin, PluginClass, System } from '../';
import type { SerializeOptions } from '../lib';
import type { BaseDataType, BaseType, Identifier, KeyedByType, Plugins, Serialized, SystemType } from '../types';

import { Deserializer, Manager, QueryBuilder, Serializer } from '../lib';
import { Phase } from '../types';
import { bigintID, IDGenerator, intID, useWithPlugins } from '../utils';
import { compose } from './composers';

export interface ContextClass<T extends Plugins<T> = Plugins<{}>> {
  new (): Context<T>;
  with<A extends PluginClass<T>[]>(...args: A): ContextClass<T & KeyedByType<A>>;
}

export class Context<T extends Plugins<T> = Plugins<{}>> {
  public static with<A extends PluginClass<any>[] = []>(...args: A): ContextClass<KeyedByType<A>> {
    return useWithPlugins(...args) as ContextClass<KeyedByType<A>>;
  }

  public $!: T;
  public ids: {
    id: IDGenerator<Identifier>;
    bigint: IDGenerator<bigint>;
  } = {
    bigint: IDGenerator.from(bigintID),
    id: IDGenerator.from(intID)
  };

  public manager: Manager;

  // binary semaphore to prevent overlapping tick() calls
  protected isLocked: boolean = false;
  protected system: System<T>;

  public get items(): PluginClass<T>[] {
    return [];
  }

  public async tick(delta: number = 0, time: number = Date.now()): Promise<void> {
    this.isLocked = true;
    await this.system.tick?.(delta, time);
    this.manager.tick();
    this.isLocked = false;
  }

  public load(save: Serialized): void {
    const d = new Deserializer(this);
    d.deserialize(save);
    this.manager.tick();
  }

  public save(options?: SerializeOptions): Serialized {
    const s = new Serializer(this);
    return s.serialize(options);
  }

  /**
   * Pre-register components, entities and tags for serialization and querying.
   * @param items - Hash from string to Entity/Component classes. These string keys are discarded.
   * @param tags - String list of tags to be pre-registered.
   *
   * @remarks
   * To avoid allocating unnecessarily large bigints, we won't be registering entities for querying, but we do need to register them for serializing/deserializing.
   */
  public register(entities: EntityClass[] = [], components: ComponentClass[] = [], tags: string[] = []): void {
    this.manager.register(entities, components, tags);
  }

  /**
   * Kickstart the Context and its systems.
   */
  public async start(): Promise<void> {
    this.$ = this.getPlugins();
    this.system = this.getSystem();

    for (const plugin of Object.values(this.$)) {
      await (plugin as Plugin).start?.();
    }
    await this.system.start?.();
    this.manager.tick();
  }

  public async stop(): Promise<void> {
    await this.system.stop?.();
    for (const plugin of Object.values(this.$)) {
      await (plugin as Plugin).stop?.();
    }
    this.manager.stop();
  }

  public create<C extends BaseType<Component>>(
    EntityConstructor: EntityClass<C>,
    data: BaseDataType<C> & { id?: Identifier } = {},
    tags: string[] = []
  ): Entity<C> {
    return this.manager.create(EntityConstructor, data, tags);
  }

  public get query(): QueryBuilder {
    return new QueryBuilder(this);
  }

  protected getPlugins(): T {
    const res = {} as T;

    for (const Plugin of this.items) {
      const plugin = new Plugin(this);
      const { entities = {}, components = {}, tags = [] } = plugin.$ ?? {};
      this.register(Object.values(entities), Object.values(components), tags);
      res[Plugin.type as keyof T] = plugin as T[keyof T];
    }
    return res;
  }

  protected getSystem(): System<T> {
    const defaultPhase = Phase.POST_UPDATE - 1;
    const systems: SystemType<T>[] = Object.values(this.items)
      .map(item => this.$[item.type as keyof T] as Plugin<T>)
      .filter(p => p.$?.systems?.length)
      .reduce((s: SystemType<T>[], plugin) => {
        const systems = plugin.$?.systems ?? [];
        return s.concat(systems) as SystemType<T>[];
      }, [])
      .flatMap(system => system)
      .sort((a, b) => (a.phase ?? defaultPhase) - (b.phase ?? defaultPhase));

    return new (compose(...systems))(this) as System<T>;
  }

  public constructor() {
    this.manager = new Manager(this);
    // @ts-ignore
    (this.$ = {}), (this.system = () => void 0);
  }
}
