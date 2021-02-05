import type { BaseType, Frozen, PartialBaseType } from '../types';
import type { Contained } from '../lib/Contained';
import type { ContainerClass } from '../lib/Container';
import type { Container } from '../lib/Container';

import { QueryManager } from './QueryManager';
import { Query } from '../ecs';

export interface Mutations {
  changed: Record<string, Set<string>>;
  created: Record<string, Set<string>>;
  removed: Record<string, Set<string>>;
}

export class ContainerManager {
  public mutations: Mutations = { changed: {}, created: {}, removed: {} };
  // ContainerID => Container
  public containers: Record<string, Container> = {};
  // ContainedID =>  Contained
  public containeds: Record<string, Contained> = {};
  // ContainerID => ContainedType => ContainedID
  public bindings: Record<string, Record<string, string>> = {};
  // ContainerID => Tag[]
  public tags: Record<string, Set<string>> = {};

  public typeCounts: Record<string, number> = {};

  // ContainerType => ContainerID[]
  public byContainerType: Record<string, string[]> = {};
  // Tag: ContainerID[]
  public byTag: Record<string, Set<string>> = {};

  // cached immutable bindings
  protected $: Record<string, any> = {};
  // entities to destroy on cleanup()
  protected toDestroy: string[] = [];
  protected queries: QueryManager;

  protected createBindings(id: string, mutable: boolean = false): any {
    const bindings = this.bindings[id];
    const res = {};
    for (const type in bindings) {
      const value = this.containeds[bindings[type]];
      if (mutable) {
        Object.defineProperty(res, type, {
          enumerable: true,
          configurable: false,
          value: new Proxy(value, {
            set: <K extends keyof Contained>(
              target: Contained,
              key: K,
              value: Contained[K]
            ) => {
              target[key] = value;
              (this.mutations.changed[id] ??= new Set()).add(target.id);
              return true;
            }
          })
        });
      } else {
        Object.defineProperty(res, type, {
          enumerable: true,
          configurable: false,
          value: new Proxy(value, { set: () => false })
        });
      }
    }
    return res;
  }

  /**
   * Given a container, return the corresponding structure for the contained bindings.
   * @param container
   * @param mutable - whether or not the returned bindings should be mutable
   *
   * @privateRemarks
   * The current implementation uses a Proxy to track changes to
   * mutable components and prevent modification of immutable components.
   */
  public getBindings<T extends BaseType<Contained>>(
    container: Container,
    mutable: false
  ): Frozen<T>;
  public getBindings<T extends BaseType<Contained>>(
    container: Container,
    mutable: true
  ): T;
  public getBindings<T extends BaseType<Contained>>(
    container: Container,
    mutable: boolean = false
  ): T | Frozen<T> {
    if (!mutable) {
      return (this.$[container.id] ??= this.createBindings(container.id));
    } else {
      return this.createBindings(container.id, true);
    }
  }

  public getTags(id: string): Set<string> {
    // do we care about mutations?
    return this.tags[id];
  }

  /**
   * Destroy an entity and its components, resetting queries if necessary.
   */
  public destroy(id: string): void {
    const bindings = this.bindings[id];
    const removed = new Set<string>();
    for (const type in bindings) {
      removed.add(bindings[type]);
    }
    delete this.$[id];
    this.mutations.removed[id] = removed;
    this.toDestroy.push(id);
  }

  public create<T extends BaseType<Contained>>(
    Constructor: ContainerClass<T>,
    data?: PartialBaseType<T>,
    tags?: string[]
  ): Container<T> {
    const instance = new Constructor();
    this.add(instance, data, tags);
    return instance;
  }

  public add<T extends BaseType>(
    container: Container<T>,
    data: PartialBaseType<T> = {},
    tags?: string[]
  ): this {
    const id = container.id;
    const bindings: Record<string, string> = {};
    const created = new Set<string>();
    const changed = new Set<string>();

    if (tags?.length) {
      this.tags[id] = new Set(tags);
      for (const t of tags) {
        const set = (this.byTag[t] ??= new Set());
        set.add(id);
      }
    }

    for (const Ctor of container.items ?? []) {
      if (!Ctor.type) {
        console.warn(
          `No static type property specified for "${Ctor.name}" belonging to ${
            container.constructor.name ?? 'unnamed container'
          }.`
        );
        continue;
      }
      // invalidate queries
      this.queries.invalidateType(Ctor.type);

      // create a new class instnace.
      const contained = new Ctor(container, {});
      // classes with defined properties overwrite assigned data.
      Object.assign(contained, data[Ctor.type]);

      // declare the component mutated for queries
      created.add(contained.id);
      changed.add(contained.id);

      // set the corresponding property on the container bindings.
      bindings[Ctor.type] = contained.id;
      // add to the manager's data hash
      this.containeds[contained.id] = contained;
      this.typeCounts[Ctor.type] = (this.typeCounts[Ctor.type] ?? 0) + 1;
    }

    Object.defineProperty(container, 'manager', {
      configurable: false,
      enumerable: false,
      value: this
    });

    // add container, bindings and id
    this.containers[id] = container;
    this.bindings[id] = bindings;

    // mutations
    this.mutations.changed[id] = changed;
    this.mutations.created[id] = created;

    const typeID = (container.constructor as ContainerClass).id;
    if (typeID) {
      (this.byContainerType[typeID] ??= []).push(container.id);
    }
    return this;
  }

  public cleanup(): void {
    this.mutations.changed = {};
    this.mutations.created = {};
    this.mutations.removed = {};
    // destroy entities marked for removal
    for (const id of this.toDestroy) {
      const container = this.containers[id];
      const type = (container.constructor as ContainerClass).id;
      for (const key in this.bindings[id]) {
        // and invalidate their queries
        this.queries.invalidateType(key);
      }
      delete this.containers[id];
      delete this.bindings[id];
      delete this.$[id];
      const byType = this.byContainerType[type];
      this.byContainerType[type].splice(byType.indexOf(id), 1);
      this.queries.invalidateEntity(id);
    }
  }

  public get items(): Container[] {
    return Object.values(this.containers);
  }

  public get ids(): string[] {
    return Object.keys(this.containers);
  }

  public get query(): Query<{}> {
    return new Query<{}>(this.queries);
  }

  public constructor() {
    this.queries = new QueryManager(this);
  }
}
