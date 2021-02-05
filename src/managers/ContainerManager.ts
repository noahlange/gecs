import type { BaseType, Frozen, PartialBaseType } from '../types';
import type { Contained } from '../lib/Contained';
import type { ContainerClass } from '../lib/Container';
import type { Container } from '../lib/Container';

import { QueryManager } from './QueryManager';
import { Query } from '../ecs';

export interface Mutations {
  changed: Record<string, string[]>;
  created: Record<string, string[]>;
  removed: Record<string, string[]>;
}

interface ContainerManagerStore {
  mutations: Mutations;
  containers: Record<string, Container>;
  containeds: Record<string, Contained>;
  bindings: Record<string, Record<string, string>>;
  tags: Record<string, string[]>;
}

interface ContainerManagerIndices {
  byTag: Record<string, string[]>;
  byContainerType: Record<string, string[]>;
}

export class ContainerManager {
  // cached immutable bindings
  protected $: Record<string, any> = {};
  // entities to destroy on cleanup()
  protected toDestroy: string[] = [];
  // query manager
  protected queries: QueryManager;

  protected store: ContainerManagerStore = {
    mutations: { changed: {}, created: {}, removed: {} },
    containers: {},
    containeds: {},
    bindings: {},
    tags: {}
  };

  protected indices: ContainerManagerIndices = {
    byTag: {},
    byContainerType: {}
  };

  protected cleanupEntities(): void {
    // destroy entities marked for removal
    for (const id of this.toDestroy) {
      const container = this.store.containers[id];
      const type = (container.constructor as ContainerClass).id;
      const byType = this.byContainerType[type];
      this.indices.byContainerType[type] = byType.filter(i => i !== id);
      this.queries.invalidateTypes(Object.keys(this.store.bindings[id]));
      this.queries.invalidateEntity(id);

      // update indices given changes to bindings
      // delete corresonding store items
      delete this.store.containers[id];
      delete this.store.bindings[id];
      delete this.$[id];
    }
    this.toDestroy = [];
  }

  protected cleanupMutations(): void {
    this.mutations.changed = {};
    this.mutations.created = {};
    this.mutations.removed = {};
  }

  protected createBindings(id: string, mutable: boolean = false): any {
    const bindings = this.store.bindings[id];
    const res = {};
    for (const type in bindings) {
      const value = this.store.containeds[bindings[type]];
      const changed = this.store.mutations.changed;
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
              (changed[id] ??= []).push(target.id);
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

  public addTags(id: string, tags: string[]): void {
    const allTags = this.store.tags[id];
    this.store.tags[id] = allTags.concat(
      tags.filter(t => allTags.indexOf(t) === -1)
    );
  }

  public hasTags(id: string, tags: string[]): boolean {
    const allTags = this.store.tags[id];
    return tags.every(t => allTags.indexOf(t) > -1);
  }

  public removeTags(id: string, tags: string[]): void {
    const allTags = this.store.tags[id];
    this.store.tags[id] = allTags.filter(t => tags.indexOf(t) === -1);
  }

  /**
   * Destroy an entity and its components, resetting queries if necessary.
   */
  public destroy(id: string): void {
    delete this.$[id];
    const bindings = this.bindings[id];
    this.mutations.removed[id] = Object.keys(bindings).map(
      type => bindings[type]
    );
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
    const store = this.store;
    const bindings: Record<string, string> = {};
    const id = container.id;

    const containeds: Contained[] = [];

    for (const Ctor of container.items) {
      // create a new class instnace.
      const contained = new Ctor(container, {});
      // classes with defined properties overwrite assigned data.
      Object.assign(contained, data[Ctor.type]);
      // set the corresponding property on the container bindings.
      bindings[Ctor.type] = contained.id;
      containeds.push(contained);
    }

    // add tags
    if (tags?.length) {
      this.tags[id] = tags;
      for (const t of tags) {
        (this.byTag[t] ??= []).push(id);
      }
    }

    Object.defineProperty(container, 'manager', {
      configurable: false,
      enumerable: false,
      value: this
    });

    // add container, bindings
    store.containers[id] = container;
    store.bindings[id] = bindings;
    // add containeds
    for (const c of containeds) {
      store.containeds[c.id] = c;
    }

    // mutations
    const ids = containeds.map(c => c.id);
    store.mutations.changed[id] = ids.slice();
    store.mutations.created[id] = ids.slice();

    // flush invalidated queries
    this.queries.invalidateTypes(container.items.map(i => i.type));

    if ('id' in container.constructor) {
      (this.indices.byContainerType[
        (container.constructor as ContainerClass).id
      ] ??= []).push(container.id);
    }
    return this;
  }

  public cleanup(): void {
    this.cleanupMutations();
    if (this.toDestroy.length) {
      this.cleanupEntities();
    }
  }

  public get mutations(): Mutations {
    return this.store.mutations;
  }

  // ContainerID => Container
  public get containers(): Record<string, Container> {
    return this.store.containers;
  }

  // ContainedID =>  Contained
  public get containeds(): Record<string, Contained> {
    return this.store.containeds;
  }

  // ContainerID => ContainedType => ContainedID
  public get bindings(): Record<string, Record<string, string>> {
    return this.store.bindings;
  }

  // ContainerID => Tag[]
  public get tags(): Record<string, string[]> {
    return this.store.tags;
  }

  // Tag: ContainerID[]
  public get byTag(): Record<string, string[]> {
    return this.indices.byTag;
  }

  // ContainerType => ContainerID[]
  public get byContainerType(): Record<string, string[]> {
    return this.indices.byContainerType;
  }

  public get items(): Container[] {
    return Object.values(this.store.containers);
  }

  public get query(): Query<{}> {
    return new Query<{}>(this.queries);
  }

  public constructor() {
    this.queries = new QueryManager(this);
  }
}
