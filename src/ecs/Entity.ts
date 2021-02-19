import type {
  BaseType,
  KeyedByType,
  OfOrArrayOf,
  PartialBaseType
} from '../types';
import type { EntityManager } from '../managers';
import type { Component, ComponentClass } from './Component';

import { useWithComponent } from '../utils';
import { QueryType } from '../types';
import { nanoid } from 'nanoid/non-secure';

export interface EntityIDs {
  [QueryType.ENT]: bigint | null;
  [QueryType.TAG]: bigint | null;
  [QueryType.CMP]: OfOrArrayOf<bigint> | null;
}

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
  add: (ComponentConstructor: ComponentClass, data: any) => void;
  remove: (...components: ComponentClass[]) => void;
  [Symbol.iterator](): Iterator<Component>;
}

export interface EntityClass<T extends BaseType = {}> {
  data?: PartialBaseType<T>;
  id: string;
  with<A extends OfOrArrayOf<ComponentClass>[], T extends BaseType = {}>(
    ...items: A
  ): EntityClass<T & KeyedByType<A>>;
  new (
    manager: EntityManager,
    data?: PartialBaseType<T>,
    tags?: string[]
  ): Entity<T>;
}

export class Entity<T extends BaseType = {}> {
  public static id: string = nanoid(8);

  public static with<T, A extends OfOrArrayOf<ComponentClass>[]>(
    ...components: A
  ): EntityClass<T & KeyedByType<A>> {
    return useWithComponent<T & KeyedByType<A>, A>(this, ...components);
  }

  protected _tags: Set<string>;

  public get components(): EntityComponents {
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
        const value = entity.$[type];
        if (Array.isArray(value)) {
          // if it's an array, we'll push it
          value.push(instance);
          entity.$[type] = value;
        } else {
          // otherwise, we'll just stick it on there
          // @todo - warn on dupes
          entity.$[type] = instance;
        }
        entity.manager.index(entity);
      },
      remove(...components: ComponentClass[]): void {
        for (const C of components) {
          delete entity.$[C.type];
        }
        entity.manager.unindex(entity);
      },
      *[Symbol.iterator](): Iterator<Component> {
        for (const component of Object.values(entity.$)) {
          yield component;
        }
      }
    };
  }

  public get tags(): EntityTags {
    const entity = this;

    return {
      all(): string[] {
        return Array.from(entity._tags);
      },
      has(...tags: string[]): boolean {
        for (const t of tags) {
          if (!entity._tags.has(t)) {
            return false;
          }
        }
        return true;
      },
      add(...tags: string[]): void {
        for (const tag of tags) {
          entity._tags.add(tag);
        }
        entity.manager.index(entity);
      },
      remove(...tags: string[]): void {
        for (const tag of tags) {
          entity._tags.delete(tag);
        }
        entity.manager.unindex(entity);
      },
      *[Symbol.iterator](): Iterator<string> {
        for (const tag of entity._tags) {
          yield tag;
        }
      }
    };
  }

  public get items(): OfOrArrayOf<ComponentClass>[] {
    return [];
  }

  public readonly $: T;
  public readonly id: string = nanoid(8);
  public readonly manager: EntityManager;
  public ids: EntityIDs = {
    [QueryType.ENT]: null,
    [QueryType.TAG]: null,
    [QueryType.CMP]: null
  };

  public destroy(): void {
    this.manager.destroy(this);
  }

  protected getBindings(data: PartialBaseType<T>): T {
    const bindings = {} as T;
    for (const Item of this.items) {
      if (Array.isArray(Item)) {
        const [Constructor] = Item;
        const type = Constructor.type as keyof T;
        // create POJOs to populate components with data
        const items = (data[type]
          ? // it may be an array, in which case we'll just use the array to populate new items...
            Array.isArray(data[type])
            ? data[type]
            : // ...or we'll just use it as the single array item
              [data[type]]
          : // no data at all, so we'll just make some empty objects
            new Array(Item.length).fill({})) as any[];
        // create a new instance for each data item we've been passed
        bindings[type] = (items.map(d =>
          Object.assign(new Constructor(), d)
        ) as unknown) as T[keyof T];
      } else {
        // otherwise, it's just a 1:1 component
        const type = Item.type as keyof T;
        bindings[type] = Object.assign(new Item(), data[type]) as T[keyof T];
      }
    }
    return bindings;
  }

  public constructor(
    manager: EntityManager,
    data: PartialBaseType<T> = {},
    tags: string[] = []
  ) {
    this.manager = manager;
    this._tags = new Set(tags);
    this.$ = this.getBindings(data);
  }
}
