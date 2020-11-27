import type { Container } from './Container';
import type { ContainedClass } from './Contained';
import type { BaseType, KeyedByType } from '../types';
import type { Manager } from './Manager';

export class Query<T extends BaseType = BaseType> {
  protected $: string[] = [];
  protected manager: Manager<T>;

  public has<A extends ContainedClass[]>(
    ...components: A
  ): Query<T & KeyedByType<A>> {
    for (const C of components) {
      this.$.push(C.type);
    }
    return (this as unknown) as Query<T & KeyedByType<A>>;
  }

  public *[Symbol.iterator](): Iterator<Container<T>> {
    items: for (const item of this.manager.items) {
      for (const key of this.$) {
        if (!this.manager.has(item.id, key)) {
          continue items;
        }
      }
      yield item;
    }
  }

  public all(): Container<T>[] {
    return Array.from(this);
  }

  public constructor(manager: Manager<T>) {
    this.manager = manager;
  }
}
