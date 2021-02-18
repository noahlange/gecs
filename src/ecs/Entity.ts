import type { BaseType, KeyedByType, PartialBaseType } from '../types';
import type { EntityManager } from '../lib';
import type { Component, ComponentClass } from './Component';

import { useWithComponent } from '../utils';
import { QueryType } from '../types';
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
  add: (ComponentConstructor: ComponentClass, data: any) => void;
  remove: (...components: ComponentClass[]) => void;
  [Symbol.iterator](): Iterator<Component>;
}

export interface EntityClass<T extends BaseType = {}> {
  data?: PartialBaseType<T>;
  id: string;
  with<A extends ComponentClass[], T extends BaseType = {}>(
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

  public static with<T, A extends ComponentClass[]>(
    ...components: A
  ): EntityClass<T & KeyedByType<A>> {
    return useWithComponent<T & KeyedByType<A>, A>(this, ...components);
  }

  protected _tags: Set<string>;

  public get components(): EntityComponents {
    const entity = this;
    const { events } = this.manager;
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
        entity.$[type] = Object.assign(new ComponentConstructor(), data);
        events.emit('component:added', {
          components: ComponentConstructor,
          entity
        });
        entity.manager.index(entity, QueryType.COMPONENT, [
          ComponentConstructor.type
        ]);
      },
      remove(...components: ComponentClass[]): void {
        for (const C of components) {
          events.emit('component:removed', { component: C, entity });
          delete entity.$[C.type];
        }
        entity.manager.index(
          entity,
          QueryType.COMPONENT,
          components.map(c => c.type)
        );
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
    const { events } = this.manager;
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
          events.emit('tag:added', { tag, entity });
          entity._tags.add(tag);
        }
        entity.manager.index(entity, QueryType.TAG, tags);
      },
      remove(...tags: string[]): void {
        for (const tag of tags) {
          events.emit('tag:removed', { tag });
          entity._tags.delete(tag);
        }
        entity.manager.index(entity, QueryType.TAG, tags);
      },
      *[Symbol.iterator](): Iterator<string> {
        for (const tag of entity._tags) {
          yield tag;
        }
      }
    };
  }

  public get items(): ComponentClass[] {
    return [];
  }

  public readonly $: T;
  public readonly id: string = nanoid(8);
  public readonly manager: EntityManager;
  public ids: string[] = [];

  public destroy(): void {
    this.manager.destroy(this);
  }

  public constructor(
    manager: EntityManager,
    data: PartialBaseType<T> = {},
    tags: string[] = []
  ) {
    this.manager = manager;
    this._tags = new Set(tags);
    this.$ = {} as T;
    for (const I of this.items) {
      const type = I.type as keyof T;
      this.$[type] = Object.assign(new I(), data[type]) as T[keyof T];
    }
  }
}
