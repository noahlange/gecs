import type { Plugin, PluginClass, SerializeOptions } from '../lib';
import type {
  BaseDataType,
  BaseType,
  KeyedByType,
  Plugins,
  Serialized,
  SystemType
} from '../types';
import type { Component, ComponentClass } from './Component';
import type { Entity, EntityClass } from './Entity';
import type { System } from './System';

import { Deserializer, Manager, QueryBuilder, Serializer } from '../lib';
import { Phase } from '../types';
import { useWithPlugins } from '../utils/useWith';
import { sequence } from './composers';

export interface ContextClass<T extends Plugins<T> = Plugins<{}>> {
  with<A extends PluginClass<T>[]>(
    ...args: A
  ): ContextClass<T & KeyedByType<A>>;
  new (): Context<T>;
}

export class Context<T extends Plugins<T> = Plugins<{}>> {
  public static with<A extends PluginClass<any>[] = []>(
    ...args: A
  ): ContextClass<KeyedByType<A>> {
    return useWithPlugins(...args) as ContextClass<KeyedByType<A>>;
  }

  // binary semaphore to prevent overlapping tick() calls
  protected isLocked: boolean = false;
  protected system: System<T>;

  public $!: T;
  public manager: Manager;

  public get items(): PluginClass<T>[] {
    return [];
  }

  public async tick(delta: number, time: number): Promise<void> {
    if (!this.isLocked) {
      this.isLocked = true;
      await this.system.tick?.(delta, time);
      this.manager.tick();
      this.isLocked = false;
    } else {
      console.warn('Tick duration exceeds tick rate.');
    }
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
  public register(
    entities: EntityClass[] = [],
    components: ComponentClass[] = [],
    tags: string[] = []
  ): void {
    this.manager.register(
      Object.values(entities),
      Object.values(components),
      tags
    );
  }

  /**
   * Kickstart the Context and its systems.
   */
  public async start(): Promise<void> {
    for (const plugin of Object.values(this.$)) {
      await (plugin as Plugin).start?.();
    }
    await this.system.start?.();
    this.manager.tick();
    await this.tick(0, 0);
  }

  public async stop(): Promise<void> {
    await this.system.stop?.();
    for (const plugin of Object.values(this.$)) {
      await (plugin as Plugin).stop?.();
    }
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

  protected getPlugins(): T {
    const res = {} as T;

    for (const Plugin of this.items) {
      const plugin = new Plugin(this);
      this.register(
        Object.values(plugin.$?.entities ?? {}),
        Object.values(plugin.$?.components ?? {}),
        plugin.$?.tags ?? []
      );
      res[Plugin.type as keyof T] = plugin as T[keyof T];
    }
    return res;
  }

  protected getSystem(): System<T> {
    const defaultPhase = Phase.POST_UPDATE - 1;
    const systems: SystemType<T>[] = Object.values(this.items)
      .map(item => this.$[item.type as keyof T] as Plugin<T>)
      .filter(p => p.$?.systems?.length)
      .reduce(
        (s: SystemType<T>[], p) =>
          s.concat((p.$?.systems ?? []) as SystemType<T>[]),
        []
      )
      .sort((a, b) => (a.phase ?? defaultPhase) - (b.phase ?? defaultPhase));

    return new (sequence(...systems))(this) as System<T>;
  }

  public constructor() {
    this.manager = new Manager();
    this.$ = this.getPlugins();
    this.system = this.getSystem();
  }
}
