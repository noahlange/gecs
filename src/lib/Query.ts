import type { Manager } from '.';
import type { BaseType } from '../types';
import type { ComponentClass } from '../ecs';
import type { Container } from './Container';

export class Query<
  T extends BaseType = {},
  C extends Container<T> = Container<T>
> {
  public manager: Manager;
  public items: ComponentClass[];

  public *[Symbol.iterator](): Iterator<C> {
    for (const entity of this.manager.query(...this.items)) {
      if (this.items.every(item => item.type in entity.$)) {
        // type system abuse
        yield entity as C;
      }
    }
  }

  public all(): C[] {
    return Array.from(this);
  }

  public constructor(manager: Manager, ...items: ComponentClass[]) {
    this.manager = manager;
    this.items = items;
  }
}
