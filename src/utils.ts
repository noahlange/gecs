/* eslint-disable max-classes-per-file */
import type { SystemClass } from './ecs';
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

export * from './utils/bit';
export * from './utils/useWith';
export * from './utils/ids';
