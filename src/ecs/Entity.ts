import type { Manager } from '../lib';
import type {
  $AnyEvil,
  BaseDataType,
  BaseType,
  KeyedByType,
  PartialValueByType,
  Ref
} from '../types';
import type { Component, ComponentClass } from './Component';

import { getID } from '../ids';
import { ChangeSet } from '../lib';
import { useWithComponent } from '../utils';
import { EntityRef } from './EntityRef';

export interface EntityComponents {
  all: () => readonly Component[];
  has: (...components: ComponentClass[]) => boolean;
  // @todo - here be typing dragons
  add: <C extends ComponentClass>(
    ComponentConstructor: C,
    data?: PartialValueByType<C>
  ) => void;
  remove: (...components: ComponentClass[]) => void;
}

export interface EntityClass<
  T extends BaseType = {},
  E extends Entity<T> = Entity<T>
> {
  data?: BaseDataType<T>;
  id: string;
  with<A extends ComponentClass[], T extends BaseType = {}>(
    ...items: A
  ): EntityClass<T & KeyedByType<A>>;
  new (manager: Manager, data?: BaseDataType<T>, tags?: string[]): E;
}

export class Entity<T extends BaseType = {}> {
  public static id: string = getID();

  public static with<T, A extends ComponentClass[]>(
    ...components: A
  ): EntityClass<T & KeyedByType<A>> {
    return useWithComponent<T & KeyedByType<A>, A>(this, ...components);
  }

  protected referenced: Set<EntityRef> = new Set();

  protected allComponents(): $AnyEvil[] {
    return Object.values(this.$);
  }

  protected hasComponents<C extends ComponentClass[]>(
    ...components: C
  ): this is Entity<T & KeyedByType<C>> {
    return components.every(component => component.type in this.$);
  }

  protected addComponent(
    ComponentConstructor: ComponentClass,
    data: any
  ): void {
    const type = ComponentConstructor.type as string & keyof T;
    const instance = Object.assign(new ComponentConstructor(), data);
    // get the component in question
    if (!(type in this.$)) {
      this.$[type] = instance;
      this.items.push(ComponentConstructor);
    }
    this.manager.indexEntity(this);
  }

  protected removeComponents(...components: ComponentClass[]): void {
    for (const C of components) {
      this.items.splice(this.items.indexOf(C), 1);
      delete this.$[C.type];
    }
    this.manager.indexEntity(this);
  }

  public components: EntityComponents = {
    all: this.allComponents.bind(this),
    has: this.hasComponents.bind(this),
    add: this.addComponent.bind(this),
    remove: this.removeComponents.bind(this)
  };

  public readonly $: T;
  public readonly id: string = getID();
  public readonly manager: Manager;
  public readonly tags: ChangeSet;
  public readonly items!: ComponentClass[];

  /**
   * A BigInt that corresponds to a combination of tags and components. We
   * execute queries by comparing the query's key to each entity's key. Example:
   * given (tags/components) A (0b001), B (0b010), C (0b100), the following
   * combinations will yield the corresponding keys:
   *   0b011 = A+B
   *   0b101 = A+C
   *   0b010 = B+C
   */
  public key: bigint = 0n;

  /**
   * Destroy existing references and mark the entity for destruction + re-indexing.
   */
  public destroy(): void {
    for (const reference of this.referenced) {
      reference.ref = null;
    }
    this.manager.destroy(this);
  }

  /**
   * Shorthand for `entity.components.has()`.
   */
  public has<C extends ComponentClass[]>(
    ...Components: C
  ): this is Entity<T & KeyedByType<C>> {
    return Components.every(C => C.type in this.$);
  }

  /**
   * Shorthand for `entity.tags.has()`.
   */
  public is(...tags: string[]): boolean {
    return this.tags.has(...tags);
  }

  protected getBindings(data: BaseDataType<T>): T {
    const bindings = {} as T;

    for (const Item of this.items) {
      const [type, item] = [Item.type as keyof T, new Item()];

      if (item instanceof EntityRef) {
        // modifying an object like this renders refs significantly more expensive than ordinary components
        Object.defineProperty(bindings, type, {
          get: () => item.ref,
          set: (entity: Ref<EntityRef> | null): void => {
            item.ref = entity;
            item.ref?.referenced.add(item);
          }
        });
        item.ref = data[type] ?? null;
        item.ref?.referenced.add(item);
      } else {
        bindings[type] = Object.assign(item, data[type] ?? {}) as T[keyof T];
      }
    }
    return bindings;
  }

  public constructor(
    manager: Manager,
    data: BaseDataType<T> = {},
    tags: string[] = []
  ) {
    this.manager = manager;
    this.tags = new ChangeSet(tags, () => this.manager.indexEntity(this));
    this.$ = this.getBindings(data);
    this.items = this.items.slice();
  }
}
