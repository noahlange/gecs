import type { BaseType, KeyedByType, PartialBaseType } from '../types';
import type { EntityManager } from '../managers';
import type { Component, ComponentClass } from './Component';

import { useWithComponent } from '../utils';
import { nanoid } from 'nanoid/non-secure';

export interface EntityTags {
  all: () => readonly string[];
  has: (...tags: string[]) => void;
  add: (...tags: string[]) => void;
  remove: (...tags: string[]) => void;
  [Symbol.iterator](): Iterator<string>;
}

export interface EntityComponents {
  all: () => readonly Component[];
  has: (...components: ComponentClass[]) => void;
  add: (ComponentConstructor: ComponentClass, data?: any) => void;
  remove: (...components: ComponentClass[]) => void;
  [Symbol.iterator](): Iterator<Component>;
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
  public static id: string = nanoid(6);

  public static with<T, A extends ComponentClass[]>(
    ...components: A
  ): EntityClass<T & KeyedByType<A>> {
    return useWithComponent<T & KeyedByType<A>, A>(this, ...components);
  }

  protected entityTags: Set<string>;

  public components: EntityComponents = (() => {
    const entity = this;
    return {
      all() {
        return Object.values(entity.$);
      },
      has(...components: ComponentClass[]): boolean {
        for (const { type } of components) {
          if (!(type in entity.$)) {
            return false;
          }
        }
        return false;
      },
      add(ComponentConstructor: ComponentClass, data: any): void {
        const type = ComponentConstructor.type as string & keyof T;
        const instance = Object.assign(new ComponentConstructor(), data);
        // get the component in question
        if (type in entity.$) {
          entity.$[type] = instance;
        } else {
          entity.$[type] = instance;
          entity.items.push(ComponentConstructor);
        }
        entity.manager.index(entity);
      },
      remove(...components: ComponentClass[]): void {
        for (const C of components) {
          entity.items.splice(entity.items.indexOf(C), 1);
          delete entity.$[C.type];
        }
        entity.manager.index(entity);
      },
      *[Symbol.iterator](): Iterator<Component> {
        for (const component of Object.values(entity.$)) {
          yield component;
        }
      }
    };
  })();

  public tags: EntityTags = (() => {
    const entity = this;
    return {
      all(): string[] {
        return Array.from(entity.entityTags);
      },
      has(...tags: string[]): boolean {
        for (const t of tags) {
          if (!entity.entityTags.has(t)) {
            return false;
          }
        }
        return true;
      },
      add(...tags: string[]): void {
        for (const tag of tags) {
          entity.entityTags.add(tag);
        }
        entity.manager.index(entity);
      },
      remove(...tags: string[]): void {
        for (const tag of tags) {
          entity.entityTags.delete(tag);
        }
        entity.manager.index(entity);
      },
      *[Symbol.iterator](): Iterator<string> {
        for (const tag of entity.entityTags) {
          yield tag;
        }
      }
    };
  })();

  public get items(): ComponentClass[] {
    return [];
  }

  public readonly $: T;
  public readonly id: string = nanoid(6);
  public readonly manager: EntityManager;

  public key: bigint = 0n;

  public destroy(): void {
    this.manager.destroy(this);
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
    this.entityTags = new Set(tags);
    this.$ = this.getBindings(data);
  }
}
