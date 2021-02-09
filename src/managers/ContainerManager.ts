import type { BaseType, Mutation, PartialBaseType } from '../types';
import type { Contained, ContainedClass } from '../lib/Contained';
import type { ContainerClass } from '../lib/Container';
import type { Container } from '../lib/Container';

import { QueryManager } from './QueryManager';
import { Query } from '../lib/Query';

export type Mutations = Record<Mutation, string[]>;

interface ContainerManagerStore {
  mutations: Mutations;
  containers: Record<string, Container>;
  containeds: Record<string, Contained[]>;
  tags: Record<string, string[]>;
}

interface ContainerManagerIndices {
  byTag: Record<string, string[]>;
  byContainerType: Record<string, string[]>;
  byComponent: Record<string, string[]>;
  byMutatedComponent: Record<Mutation, Record<string, string[]>>;
}

export class ContainerManager {
  // cached immutable bindings
  protected $: WeakMap<Container, BaseType> = new WeakMap();
  // entities to destroy on cleanup()
  protected toDestroy: string[] = [];
  // query manager
  protected queries: QueryManager;

  protected store: ContainerManagerStore = {
    mutations: { changed: [], created: [], removed: [] },
    containers: {},
    containeds: {},
    tags: {}
  };

  protected indices: ContainerManagerIndices = {
    byMutatedComponent: { changed: {}, created: {}, removed: {} },
    byContainerType: {},
    byComponent: {},
    byTag: {}
  };

  protected cleanupEntities(): void {
    // destroy entities marked for removal
    for (const id of this.toDestroy) {
      const container = this.store.containers[id];
      const type = (container.constructor as ContainerClass).id;
      const byType = this.byContainerType[type];
      this.indices.byContainerType[type] = byType.filter(i => i !== id);

      this.queries.invalidateEntity(id);
      // update indices given changes to bindings
      // delete corresonding store items
      delete this.store.containers[id];
    }
    this.toDestroy = [];
  }

  protected cleanupMutations(): void {
    this.store.mutations = { changed: [], created: [], removed: [] };
    this.indices.byMutatedComponent = { changed: {}, created: {}, removed: {} };
  }

  protected createBindings<T extends BaseType<Contained>>(id: string): T {
    const res: Record<string, Contained> = {};
    for (const o of this.store.containeds[id]) {
      const type = (o.constructor as ContainedClass).type;
      res[type] = new Proxy(o, {
        set: <T extends Contained>(
          target: T,
          key: keyof T,
          value: T[keyof T]
        ) => {
          this.store.mutations.changed.push(target.id);
          (this.indices.byMutatedComponent.changed[type] ??= []).push(id);
          target[key] = value;
          return true;
        }
      });
    }
    return res as T;
  }

  /**
   * Given a container, return the corresponding structure for the contained bindings.
   * @param container
   *
   * @privateRemarks
   * The current implementation uses a Proxy to track changes to
   * mutable components and prevent modification of immutable components.
   */
  public getBindings<T extends BaseType<Contained>>(container: Container): T {
    const bindings = this.$.get(container) ?? this.createBindings(container.id);
    this.$.set(container, bindings);
    return (bindings as unknown) as T;
  }

  public addTags(id: string, tags: string[]): void {
    const allTags = this.store.tags[id] ?? [];
    this.store.tags[id].push(...tags.filter(t => allTags.indexOf(t) === -1));
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
  public destroy(container: Container): void {
    this.$.delete(container);
    // this.store.mutations.removed.push(this.store.containeds[container.id]);
    this.toDestroy.push(container.id);
  }

  public create<T extends BaseType<Contained>>(
    Constructor: ContainerClass<T>,
    data?: PartialBaseType<T>,
    tags?: string[]
  ): Container<T> {
    return this.add(new Constructor(), data, tags);
  }

  public add<T extends BaseType>(
    container: Container<T>,
    data: PartialBaseType<T> = {},
    tags?: string[]
  ): Container<T> {
    const ContainerCtor = container.constructor as ContainerClass;
    const d = Object.assign(ContainerCtor.data ?? {}, data);
    const containeds: Contained[] = [];
    const id = container.id;
    const types = [];
    const ids = [];

    for (const Ctor of container.items) {
      const type = Ctor.type;
      // update indices
      // create a new class instance.
      // classes with defined properties overwrite assigned data.
      const res = Object.assign(new Ctor(container, {}), d[type] ?? {});
      // set the corresponding property on the container bindings.
      (this.indices.byComponent[type] ??= []).push(id);
      (this.indices.byMutatedComponent.created[type] ??= []).push(id);
      containeds.push(res);
      types.push(type);
      ids.push(id);
    }

    // add tags
    if (tags?.length) {
      this.store.tags[id] = tags;
      for (const t of tags) {
        (this.indices.byTag[t] ??= []).push(id);
      }
    }

    // add container, bindings

    // mutations
    this.store.mutations.created.push(...ids);
    // nuke invalidated queries
    this.queries.invalidateTypes(types);
    this.store.containeds[id] = containeds;
    this.store.containers[id] = container;

    if (ContainerCtor.id) {
      (this.indices.byContainerType[ContainerCtor.id] ??= []).push(
        container.id
      );
    }

    // So this is a bit of a pickle. Dynamically defining the property imposes a
    // bonkers performance hit, but inspection and serialization gets more
    // difficult w/r/t circular structures.
    // Object.defineProperty(container, 'manager', { get: () => this });
    // @ts-ignore
    container.manager = this;
    return container;
  }

  public cleanup(): void {
    this.cleanupMutations();
    if (this.toDestroy.length) {
      this.cleanupEntities();
    }
  }

  public containers = {
    ids: () => Object.keys(this.store.containers),
    get: (id: string): Container => this.store.containers[id],
    hasContained: (id: string, Contained: ContainedClass): boolean => {
      return this.store.containers[id].items.indexOf(Contained) > -1;
    },
    hasAnyContained: (id: string, Containeds: ContainedClass[]): boolean => {
      const container = this.store.containers[id];
      for (const C of Containeds) {
        if (container.items.indexOf(C) > -1) {
          return true;
        }
      }
      return false;
    },
    hasAllContaineds: (id: string, Containeds: ContainedClass[]): boolean => {
      const container = this.store.containers[id];
      for (const C of Containeds) {
        if (container.items.indexOf(C) === -1) {
          return false;
        }
      }
      return true;
    }
  };

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

  // ContainerType => ContainerID[]
  public get byComponent(): Record<string, string[]> {
    return this.indices.byComponent;
  }

  public get byMutatedComponent(): Record<string, Record<string, string[]>> {
    return this.indices.byMutatedComponent;
  }

  public get query(): Query {
    return new Query(this.queries);
  }

  public constructor() {
    this.queries = new QueryManager(this);
  }
}
