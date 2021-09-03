import type { EntityClass, SystemClass } from './ecs';
import type { Plugins, SystemType } from './types';

/**
 * Determine if a system-like function is the constructor of a stateful system
 * or simply a stateless function system.
 */
export function isSystemConstructor<T extends Plugins<T>>(
  system: SystemType<T>
): system is SystemClass<T> {
  return !!(
    system.prototype?.tick ??
    system.prototype?.stop ??
    system.prototype?.start
  );
}

export const debug = {
  /**
   * Helps track memory leaks by throwing upon `$` access once destroyed.
   *
   * ```ts
   * @debug.leak
   * class MyClass extends Entity.with(A, B, C) {
   * }
   * ```
   */
  leak: (constructor: EntityClass) => {
    const destroy = constructor.prototype.destroy;
    constructor.prototype.destroy = function () {
      destroy.call(this);
      Object.defineProperty(this, '$', {
        get: () => {
          throw new Error(`Memory leak detected: entity ${this.id}.`);
        }
      });
    };
  }
};

export * from './utils/bit';
export * from './utils/useWith';
export * from './utils/ids';
