import type {
  $AnyEvil,
  $AnyOK,
  BaseDataType,
  BaseType,
  Identifier,
  KeyedByType,
  MergeData,
  PartialValueByType,
  Ref
} from '../types';
import type { Context } from '.';
import type { Component, ComponentClass } from './Component';

import { ChangeSet, Manager } from '../lib';
import { Components, ToDestroy, ToIndex } from '../types';
import { useWithComponent } from '../utils';
import { EntityRef } from './EntityRef';

export interface EntityComponents {
  all: () => readonly Component[];
  has: (...components: ComponentClass[]) => boolean;
  // @todo - here be typing dragons
  add: <C extends ComponentClass>(ComponentConstructor: C, data?: PartialValueByType<C>) => void;
  remove: (...components: ComponentClass[]) => void;
  delete: (...components: ComponentClass[]) => void;
  [Symbol.iterator](): Generator<Component>;
}

export interface EntityClass<T extends BaseType = {}, E extends Entity<T> = Entity<T>> {
  data?: BaseDataType<T>;
  new (context: Context, data?: BaseDataType<T>, tags?: string[]): E;
  with<A extends ComponentClass[]>(...items: A): EntityClass<T & KeyedByType<A>>;
}

export class Entity<T extends BaseType = {}> {
  public static ctx: Context | null = null;

  public static create<T extends BaseDataType>(data: BaseDataType<T> & { id?: Identifier } = {}, tags: string[] = []) {
    try {
      return this.ctx!.create(this, data, tags);
    } catch {
      throw new Error('You must assign a global context to Entity.ctx before calling Entity.create().');
    }
  }

  public static with<
    T extends BaseType,
    A extends ComponentClass[],
    M extends MergeData<T & KeyedByType<A>> = MergeData<T & KeyedByType<A>>
  >(...components: A): EntityClass<M> {
    return useWithComponent<M, A>(this, ...components);
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
  public readonly [Components]!: ComponentClass[];

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

  protected readonly mid: Identifier;
  protected readonly refs: EntityRef[] = [];

  public is(...tags: string[]): boolean {
    return this.tags.has(...tags);
  }

  public has<C extends ComponentClass[]>(...components: C): this is Entity<T & KeyedByType<C>> {
    return components.every(component => component.type in this.$);
  }

  /**
   * Destroy existing references and mark the entity for destruction + re-indexing.
   */
  public destroy(): void {
    if (this.refs.length) {
      for (const reference of this.refs) {
        if (reference.entity === this) {
          reference.entity = null;
        }
        if (reference.ref === this) {
          reference.ref = null;
        }
      }
      this.refs.splice(0, this.refs.length);
    }
    Manager[ToDestroy][this.mid].push(this);
  }

  protected getBindings(data: BaseDataType<T>): T {
    const bindings = {} as T;

    for (const Item of this[Components]) {
      const [type, item] = [Item.type as keyof T, new Item()];

      if (item instanceof EntityRef) {
        this.refs.push(item);
        item.entity = this;
        // modifying an object like this renders refs significantly more expensive than ordinary components
        Object.defineProperty(bindings, type, {
          get: () => item.ref,
          set: (entity: Ref<EntityRef> | null): void => {
            const current = item.ref as Entity<{}>;
            if (current) {
              // need to remove it from an existing entity's list of refs
              current.refs.splice(current.refs.indexOf(item), 1);
            }
            item.ref = entity;
            entity?.refs.push(item);
          }
        });
        // since defineProperty throws types out the window anyways, I think this is unavoidable.

        (bindings[type] as $AnyOK) = data[type] ?? null;
      } else {
        bindings[type] = Object.assign(item, data[type] ?? {}) as T[keyof T];
      }
    }
    return bindings;
  }

  protected allComponents(): $AnyEvil[] {
    return Object.values(this.$);
  }

  protected addComponent<C extends ComponentClass>(ComponentConstructor: C, data?: PartialValueByType<C>): void {
    const type = ComponentConstructor.type as string & keyof T;
    let dirty = false;
    if (!(type in this.$)) {
      // get the component in question
      this.$[type] = Object.assign(new ComponentConstructor(), data ?? {}) as T[string & keyof T];
      this[Components].push(ComponentConstructor);
      // turns out indexing repeatedly is faster than doing a bool set/check
      Manager[ToIndex][this.mid].push([this, this.key ?? null]);
      // we're opting out of an optimization that uses a precomputed component key for each entity class.
      dirty = true;
    }
    if (dirty) {
      // reset the parent constructor to "Entity" — the component key now needs to be recomputed
      this.constructor = Entity;
    }
  }

  protected removeComponents(...components: ComponentClass[]): void {
    let dirty = false;
    for (const C of components) {
      if (C.type in this.$) {
        this[Components].splice(this[Components].indexOf(C), 1);
        delete this.$[C.type];
        Manager[ToIndex][this.mid].push([this, this.key ?? null]);
        dirty = true;
      }
    }
    if (dirty) {
      this.constructor = Entity;
    }
  }

  public constructor(context: Context, data: BaseDataType<T> & { id?: Identifier } = {}, tags: string[] = []) {
    this.id = data.id ?? context.ids.id.next();
    this.mid = context.manager.id;
    this.tags = new ChangeSet(tags, () => {
      Manager[ToIndex][this.mid].push([this, this.key ?? null]);
    });
    // we need a unique copy of this in case we modify its components later on
    this[Components] = (this.constructor.prototype[Components] ?? []).slice();
    this.$ = this.getBindings(data);
  }
}
