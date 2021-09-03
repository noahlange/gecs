// phases of child systems in parallel and conditional composers are IGNORED
// only top-level systems and sequences have their phases respected

import type { Plugins, SystemType } from '../../types';

import { compose } from './Composer';

/**
 * Assign a phase priority to one or more systems.
 */
export function phase<T extends Plugins<T>>(
  phase: number,
  ...systems: SystemType<T>[]
): SystemType<T> & { phase: number } {
  // Don't wrap it in yet another sequence if we can avoid it...
  const system = systems.length === 1 ? systems.shift()! : compose(...systems);
  return Object.assign(system, { phase });
}
