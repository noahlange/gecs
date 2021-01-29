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
  // IDs of recently-modified Containeds
  protected mutations: Set<string> = new Set();
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

  public getBindings<T extends BaseType<Contained>>(
    container: Container,
    mutable: false
  ): Frozen<T>;
  public getBindings<T extends BaseType<Contained>>(
    container: Container,
    mutable: true
  ): T;
  /**
   * Given a container, return the corresponding structure for the contained bindings.
   * @param container
   * @param mutable - whether or not the returned bindings should be mutable (default: false)
   */
  public getBindings<T extends BaseType<Contained>>(
    container: Container,
    mutable: boolean = false
  ): T | Frozen<T> {
    // type system abuse
    const bindings = this.bindings[container.id];
    const res = {};
    for (const type in bindings) {
      const value = this.containeds[bindings[type]];
      Object.defineProperty(
        res,
        type,
        mutable
          ? {
              get: () => {
                /**
                 * @todo - marking it dirty on get() will create false positives
                 * for mutated component queries; I don't know the value of a
                 * more accurate report vs. runtime slowdown.
                 */
                this.mutations.add(value.id);
                return value;
              },
              enumerable: true
            }
          : /** @todo - determine the fastest way to get a shallow frozen copy */
            { get: () => value, enumerable: true }
      );
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
    const hasMutations = !!(options.changed || options.unchanged);
    const cacheHit = options.ids ? null : this.cache[cacheKey];

    if (cacheHit && !hasMutations) {
      for (const id of cacheHit) {
        yield this.containers[id];
      }
      return;
    }

    const ids = options.ids ?? cacheHit ?? this.ids;
    const results: string[] = [];

    for (const id of ids) {
      const bindings = this.bindings[id];
      if (!bindings) {
        continue;
      }

      if (!cacheHit) {
        // check the includes/excludes
        if (
          options.includes?.some(t => !(t in bindings)) ||
          options.excludes?.some(t => t in bindings)
        ) {
          continue;
        }
      }

      results.push(id);

      if (hasMutations) {
        const hasMutated = (t: string): boolean =>
          this.mutations.has(bindings[t]);

        if (options.unchanged?.some(hasMutated)) {
          continue;
        }

        if (options.changed?.some(hasMutated)) {
          for (const t of options.changed ?? []) {
            this.mutations.delete(bindings[t]);
          }
        } else {
          continue;
        }
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
        this.mutations.add(contained.id);
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
