import type { BaseType, Frozen, PartialBaseType } from '../types';

import type { Contained } from './Contained';
import type { ContainerClass } from './Container';
import { Container } from './Container';
import { QueryManager } from './QueryManager';
import { Query } from '../ecs';

interface ContainerMutations {
  changed: Set<string>;
  created: Set<string>;
  removed: Set<string>;
}

export class Manager {
  protected containerMutations: ContainerMutations = {
    changed: new Set(),
    created: new Set(),
    removed: new Set()
  };

  // ContainerID => Container
  protected containers: Record<string, Container> = {};
  // ContainedID => Contained
  protected containeds: Record<string, Contained> = {};
  // ContainerID => ContainedType => Contained
  protected bindings: Record<string, Record<string, string>> = {};
  // entities to destroy at cleanup()
  protected toDestroy: string[] = [];
  protected queries: QueryManager;

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
        get: () => {
          if (mutable) {
            this.containerMutations.changed.add(value.id);
            return value;
          } else {
            return new Proxy(value, { set: () => false });
          }
        }
      });
    }
    return res as T;
  }

  public getContainer(id: string): Container {
    return this.containers[id] ?? null;
  }

  /**
   * Destroy an entity and its components, resetting queries if necessary.
   */
  public destroy(id: string): void {
    const bindings = this.bindings[id];
    for (const type in bindings) {
      this.mutations.removed.add(bindings[type]);
    }
    this.toDestroy.push(id);
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

        // declare the component mutated for queries
        this.containerMutations.created.add(contained.id);
        this.containerMutations.changed.add(contained.id);
        // if we've cached a query with this component, it'll need to be nuked.
        this.queries.invalidateType(type);
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
    return this;
  }

  public getIDBindings(id: string): Record<string, string> | null {
    return this.bindings[id] ?? null;
  }

  public cleanup(): void {
    this.containerMutations.changed = new Set();
    this.containerMutations.created = new Set();
    this.containerMutations.removed = new Set();
    // destroy entities marked for removal
    for (const id of this.toDestroy) {
      for (const key in this.bindings[id]) {
        // and invalidate their queries
        this.queries.invalidateType(key);
      }
      delete this.containers[id];
      delete this.bindings[id];
    }
  }

  public get items(): Container[] {
    return Object.values(this.containers);
  }

  public get ids(): string[] {
    return Object.keys(this.containers);
  }

  public get mutations(): ContainerMutations {
    return this.containerMutations;
  }

  public get query(): Query<{}> {
    return new Query<{}>(this.queries);
  }

  public constructor() {
    this.queries = new QueryManager(this);
  }
}
