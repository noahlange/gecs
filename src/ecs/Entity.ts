import type {
  $AnyEvil,
  $AnyOK,
  BaseDataType,
  BaseType,
  Identifier,
  KeyedByType,
  PartialValueByType,
  Ref
} from '../types';
import type { Context } from '.';
import type { Component, ComponentClass } from './Component';

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
  delete: (...components: ComponentClass[]) => void;
  [Symbol.iterator](): Generator<Component>;
}

export interface EntityClass<
  T extends BaseType = {},
  E extends Entity<T> = Entity<T>
> {
  data?: BaseDataType<T>;
  new (context: Context, data?: BaseDataType<T>, tags?: string[]): E;
  with<A extends ComponentClass[], T extends BaseType = {}>(
    ...items: A
  ): EntityClass<T & KeyedByType<A>>;
}

export class Entity<T extends BaseType = {}> {
  public static with<T, A extends ComponentClass[]>(
    ...components: A
  ): EntityClass<T & KeyedByType<A>> {
    return useWithComponent<T & KeyedByType<A>, A>(this, ...components);
  }

  /**
   * A BigInt that corresponds to a combination of tags and components. We execute queries by comparing queries' keys to each entity's key.
   *
   * @example
   * Given (tags/components) A (0b001), B (0b010), C (0b100), the following combinations will yield the corresponding keys:
   *   A+B = 0b011
   *   A+C = 0b101
   *   B+C = 0b010
   */
  public key: bigint = 0n;
  public readonly $: T;
  public readonly id: Identifier;
  public readonly tags: ChangeSet;
  public readonly items!: ComponentClass[];

  public get components(): EntityComponents {
    return {
      all: this.allComponents.bind(this),
      has: this.has.bind(this),
      add: this.addComponent.bind(this),
      remove: this.removeComponents.bind(this),
      delete: this.removeComponents.bind(this),
      [Symbol.iterator]: function* () {
        yield* this.all();
      }
    };
  }

  protected readonly ctx: Context;
  protected readonly refs: EntityRef[] = [];

  public is(...tags: string[]): boolean {
    return this.tags.has(...tags);
  }

  public has = <C extends ComponentClass[]>(
    ...components: C
  ): this is Entity<T & KeyedByType<C>> => {
    return components.every(component => component.type in this.$);
  };

  /**
   * Destroy existing references and mark the entity for destruction + re-indexing.
   */
  public destroy(): void {
    for (const reference of this.refs) {
      if (reference.entity === this) {
        reference.entity = null;
      }
      if (reference.ref === this) {
        reference.ref = null;
      }
    }
    this.refs.splice(0, this.refs.length);
    this.ctx.manager.destroy(this);
  }

  protected getBindings(data: BaseDataType<T>): T {
    const bindings = {} as T;

    for (const Item of this.items) {
      const [type, item] = [Item.type as keyof T, new Item()];

      if (item instanceof EntityRef) {
        this.refs.push(item);
        item.entity = this;
        // modifying an object like this renders refs significantly more expensive than ordinary components
        Object.defineProperty(bindings, type, {
          get: () => item.ref,
          set: (entity: Ref<EntityRef> | null): void => {
            item.ref = entity;
            entity?.refs.push(item);
          }
        });

        // since defineProperty throws everything out the window, I think this is unavoidable.
        (bindings[type] as $AnyOK) = data[type] ?? null;
      } else {
        bindings[type] = (
          data[type] ? Object.assign(item, data[type] ?? {}) : item
        ) as T[keyof T];
      }
    }
    return bindings;
  }

  protected allComponents(): $AnyEvil[] {
    return Object.values(this.$);
  }

  protected addComponent<C extends ComponentClass>(
    ComponentConstructor: C,
    data?: PartialValueByType<C>
  ): void {
    const type = ComponentConstructor.type as string & keyof T;
    if (!(type in this.$)) {
      // get the component in question
      this.$[type] = (
        data
          ? Object.assign(new ComponentConstructor(), data)
          : new ComponentConstructor()
      ) as T[string & keyof T];

      this.items.push(ComponentConstructor);
      // turns out indexing repeatedly is faster than doing a bool set/check
      this.ctx.manager.indexEntity(this);
    }
  }

  protected removeComponents(...components: ComponentClass[]): void {
    for (const C of components) {
      if (C.type in this.$) {
        this.items.splice(this.items.indexOf(C), 1);
        delete this.$[C.type];
        this.ctx.manager.indexEntity(this);
      }
    }
  }

  public constructor(
    context: Context,
    data: BaseDataType<T> = {},
    tags: string[] = []
  ) {
    this.ctx = context;
    this.tags = new ChangeSet(tags, () => this.ctx.manager.indexEntity(this));
    // we need a unique copy of this in case we modify its components later on
    this.items = (this.items ?? []).slice();
    this.$ = this.getBindings(data);
    this.id = context.ids.id.next();
  }
}
