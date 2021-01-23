import type { BaseType, KeyedByType } from '../../types';
import type { System, SystemClass } from '../contained/System';
import type { ComponentClass } from '../contained/Component';

import { useWith } from '../../utils';
import { Container, Manager } from '../../lib';
import { Query } from '../../lib/Query';

export interface WorldClass<T extends BaseType<System>> {
  with<A extends SystemClass[], T = {}>(
    ...systems: A
  ): WorldClass<T & KeyedByType<A>>;
  new (): World<T>;
}

export class World<T extends BaseType<System> = {}> extends Container<T> {
  public static with<A extends SystemClass[], T = {}>(
    ...systems: A
  ): WorldClass<T & KeyedByType<A>> {
    // type system abuse
    return useWith<T & KeyedByType<A>, A>(this, ...systems) as WorldClass<
      T & KeyedByType<A>
    >;
  }

  /**
   * Return an iterable of entities with all matching components.
   * @param components - required components
   */
  public query<A extends ComponentClass[]>(
    ...components: A
  ): Query<KeyedByType<A>> {
    return new Query<KeyedByType<A>>(this.entities, ...components);
  }

  // would be nice to be able to pass this directly as a function.
  public tick(delta: number, time?: number): void {
    for (const system in this.$) {
      this.$[system].tick.call(this.$[system], delta, time);
    }
  }

  /**
   * Custom setup logic to be implemented as deemed necessary.
   */
  public init?(): void;

  /**
   * Kickstart the world and its systems.
   */
  public start(): void {
    this.manager.init();
    for (const system in this.$) {
      this.$[system].init?.();
    }
    this.entities.init();
  }

  public entities = new Manager();
}
