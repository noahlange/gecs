import type { Manager } from '.';
import type { BaseType, KeyedByType } from '../types';
import type { ComponentClass } from '../ecs';
import type { Container } from './Container';
import type { U } from 'ts-toolbelt';

export class Query<
  T extends BaseType = {},
  C extends Container<T> = Container<T>
> {
  public manager: Manager;

  protected has: Set<string> = new Set();
  protected notHas: Set<string> = new Set();

  public with<A extends ComponentClass[]>(
    ...items: A
  ): Query<U.Merge<T & KeyedByType<A>>> {
    for (const item of items) {
      this.has.add(item.type);
    }
    return (this as unknown) as Query<U.Merge<T & KeyedByType<A>>>;
  }

  public without(...items: ComponentClass[]): this {
    for (const item of items) {
      this.notHas.add(item.type);
    }
    return this;
  }

  public *[Symbol.iterator](): Iterator<C> {
    const entities = this.manager.query(
      Array.from(this.has),
      Array.from(this.notHas)
    );

    for (const entity of entities) {
      // type system abuse
      yield entity as C;
    }
  }

  public all(): C[] {
    return Array.from(this);
  }

  public constructor(manager: Manager) {
    this.manager = manager;
  }
}
