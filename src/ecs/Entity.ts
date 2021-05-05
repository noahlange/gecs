import type { BaseType, KeyedByType, PartialBaseType } from '../types';
import type { EntityManager } from '../managers';
import type { Component, ComponentClass } from './Component';

import { ChangeSet } from '../lib/ChangeSet';
import { useWithComponent } from '../utils';
import { getID } from '../ids';

export interface EntityComponents {
  all: () => readonly Component[];
  has: (...components: ComponentClass[]) => boolean;
  add: (ComponentConstructor: ComponentClass, data?: any) => void;
  // @todo - here be typing dragons
  remove: (...components: ComponentClass[]) => void;
}

export interface EntityClass<
  T extends BaseType = {},
  E extends Entity<T> = Entity<T>
> {
  data?: PartialBaseType<T>;
  id: string;
  with<A extends ComponentClass[], T extends BaseType = {}>(
    ...items: A
  ): EntityClass<T & KeyedByType<A>>;
  new (manager: EntityManager, data?: PartialBaseType<T>, tags?: string[]): E;
}

export class Entity<T extends BaseType = {}> {
  public static id: string = getID();

  public static with<T, A extends ComponentClass[]>(
    ...components: A
  ): EntityClass<T & KeyedByType<A>> {
    return useWithComponent<T & KeyedByType<A>, A>(this, ...components);
  }

  public components: EntityComponents = {
    all: () => {
      return Object.values(this.$);
    },
    has: <C extends ComponentClass[]>(
      ...components: C
    ): this is Entity<T & KeyedByType<C>> => {
      for (const { type } of components) {
        if (!(type in this.$)) {
          return false;
        }
      }
      return true;
    },
    add: (ComponentConstructor: ComponentClass, data: any): void => {
      const type = ComponentConstructor.type as string & keyof T;
      const instance = Object.assign(new ComponentConstructor(), data);
      // get the component in question
      if (!(type in this.$)) {
        this.$[type] = instance;
        this.items.push(ComponentConstructor);
      }
      this.manager.index(this);
    },
    remove: (...components: ComponentClass[]): void => {
      for (const C of components) {
        this.items.splice(this.items.indexOf(C), 1);
        delete this.$[C.type];
      }
      this.manager.index(this);
    }
  };

  public get items(): ComponentClass[] {
    return [];
  }

  public readonly $: T;
  public readonly id: string = getID();
  public readonly manager: EntityManager;
  public readonly tags: ChangeSet<string>;

  public key: bigint = 0n;

  public destroy(): void {
    this.manager.destroy(this);
  }

  // shorthand for entity.components.has
  public has<C extends ComponentClass[]>(
    ...Components: C
  ): this is Entity<T & KeyedByType<C>> {
    return Components.every(C => C.type in this.$);
  }

  public is(...tags: string[]): boolean {
    return this.tags.has(...tags);
  }

  protected getBindings(data: PartialBaseType<T>): T {
    const bindings = {} as T;
    for (const Item of this.items) {
      if (!Item) {
        console.warn(
          `Attempted to add undefined component to entity "${this.constructor.name}".`
        );
        continue;
      }
      const type = Item.type as keyof T;
      bindings[type] = Object.assign(new Item(), data[type]) as T[keyof T];
    }
    return bindings;
  }

  public constructor(
    manager: EntityManager,
    data: PartialBaseType<T> = {},
    tags: string[] = []
  ) {
    this.manager = manager;
    this.tags = new ChangeSet(tags, () => this.manager.index(this));
    this.$ = this.getBindings(data);
  }
}
