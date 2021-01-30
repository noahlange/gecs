import type { BaseType, Frozen, PartialBaseType } from '../types';

import type { Contained } from './Contained';
import type { ContainerClass } from './Container';
import { Container } from './Container';

export interface ContainerQueryOptions {
  ids: string[] | null;
  includes: string[] | null;
  excludes: string[] | null;
  changed: string[] | null;
  unchanged: string[] | null;
}

export class Manager {
  // ContainerID => ContainedType => ContainedID
  protected mutations: Record<string, string[]> = {};
  // ContainerID => Container
  protected containers: Record<string, Container> = {};
  // ContainedID => Contained
  protected containeds: Record<string, Contained> = {};
  // ContainerID => ContainedType => Contained
  protected bindings: Record<string, Record<string, string>> = {};
  // QueryID => ContainerID
  protected cache: Record<string, string[] | null> = {};
  protected ids: string[] = [];

  /**
   * Naïve cache-busting implementation.
   */
  protected invalidateQueries(type: string): void {
    for (const q in this.cache) {
      if (q.includes(type)) {
        delete this.cache[q];
      }
    }
  }

  /**
   * Given a container, return the corresponding structure for the contained bindings.
   * @param container
   * @param mutable - whether or not the returned bindings should be mutable
   *
   *
   * @privateRemarks
   * The current implementation involves the use of a Proxy to track changes to
   * mutable components and prevent modification of immutable components.
   * There's about a 10% performance hit vs. returning the raw value.
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
    // type system abuse
    const bindings = this.bindings[container.id];
    const res = {};
    for (const type in bindings) {
      const value = this.containeds[bindings[type]];
      Object.defineProperty(res, type, {
        enumerable: true,
        get: () =>
          new Proxy(value, {
            set: mutable
              ? // if it's mutable, mark it as changed...
                <C extends Contained>(target: C, k: keyof C, v: C[keyof C]) => {
                  target[k] = v;
                  this.mutations[container.id].push(type);
                  return true;
                }
              : // ...otherwise ignore
                () => false
          })
      });
    }
    return res as T;
  }

  /**
   * Destroy an entity and its components, resetting queries if necessary.
   */
  public destroy(id: string): void {
    this.ids.splice(this.ids.indexOf(id), 1);
    for (const type in this.bindings[id]) {
      this.invalidateQueries(type);
      delete this.containeds[this.bindings[id][type]];
    }
    delete this.containers[id];
  }

  public get items(): Container[] {
    return this.ids.map(id => this.containers[id]);
  }

  public create<T extends BaseType<Contained>>(
    Constructor: ContainerClass<T>,
    data?: PartialBaseType<T>
  ): Container<T> {
    const instance = new Constructor(this, data);
    if (instance instanceof Container) {
      return instance;
    } else {
      const message = Constructor.name
        ? 'an unnamed container instance'
        : `a container instance of '${Constructor.name}'`;
      throw new Error(
        `Attempted to create ${message} without extending the Container class.`
      );
    }
  }

  public *query(options: ContainerQueryOptions): IterableIterator<Container> {
    const cacheKey = JSON.stringify([options.includes, options.excludes]);
    const queryMutations = !!(options.changed || options.unchanged);
    const cacheHit = options.ids ? null : this.cache[cacheKey];

    if (cacheHit && !queryMutations) {
      for (const id of cacheHit) {
        yield this.containers[id];
      }
      return;
    }

    const ids = options.ids ?? cacheHit ?? this.ids;
    const results: string[] = [];

    entities: for (const id of ids) {
      const bindings = this.bindings[id];
      if (!bindings) {
        continue entities;
      }

      if (!cacheHit) {
        for (const e of options.excludes ?? []) {
          if (e in bindings) {
            continue entities;
          }
        }
        for (const i of options.includes ?? []) {
          if (!(i in bindings)) {
            continue entities;
          }
        }
      }

      results.push(id);

      if (queryMutations) {
        const mutations = this.mutations[id];
        if (mutations.length === 0) {
          continue entities;
        }

        let uPass = true;
        const unchanged = options.unchanged ?? [];
        for (let u = 0; u < unchanged.length; u++) {
          if (mutations.includes(unchanged[u])) {
            uPass = false;
            mutations.splice(u, 1);
          }
        }

        if (!uPass) {
          continue entities;
        }

        let cPass = true;
        const changed = options.changed ?? [];
        for (let c = 0; c < changed.length; c++) {
          if (!mutations.includes(changed[c])) {
            cPass = false;
          } else {
            mutations.splice(c, 1);
          }
        }

        if (!cPass) {
          continue entities;
        }

        this.mutations[id] = mutations;
      }

      yield this.containers[id];
    }

    if (!options.ids) {
      this.cache[cacheKey] = results;
    }

    return;
  }

  public add<T extends BaseType>(
    container: Container<T>,
    data: PartialBaseType<T> = {}
  ): this {
    const bindings: Record<string, string> = {};
    this.mutations[container.id] = [];

    for (const Ctor of container.items ?? []) {
      const type = Ctor.type;
      if (type) {
        // instantiate and overwrite with user data
        const contained = new Ctor();
        // add to the manager's data hash and
        this.containeds[contained.id] = contained;

        // set the corresponding property on the container bindings.
        bindings[Ctor.type] = contained.id;
        Object.assign(contained, data[type] ?? {});

        // define a `.container` accessor, perserving the reference without
        // adding a pointless read-only property to the object.
        Object.defineProperty(contained, 'container', {
          configurable: false,
          enumerable: false,
          get: () => container
        });

        //declare the component mutated for queries
        this.mutations[container.id].push(type);
        // if we've cached a query with this component, it'll need to be nuked.
        this.invalidateQueries(type);
      } else {
        console.warn(
          `No static type property specified for "${Ctor.name}" belonging to ${
            container.constructor.name ?? 'unnamed container'
          }.`
        );
      }
    }

    // dynamically define a manager accessor for the reasons listed above.
    Object.defineProperty(container, 'manager', {
      configurable: false,
      enumerable: false,
      get: () => this
    });

    // add container, bindings and id
    this.containers[container.id] = container;
    this.bindings[container.id] = bindings;
    this.ids.push(container.id);
    return this;
  }
}
