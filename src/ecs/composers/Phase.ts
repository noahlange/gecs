// phases of child systems in parallel, sequence, conditional composers are IGNORED
// only top-level systems' phases are respected

import type { Plugins, SystemType } from '../../types';

import { sequence } from './Sequence';

/**
 * Assign a phase priority to one or more systems.
 */
export function phase<T extends Plugins<T>>(
  id: number,
  ...systems: SystemType<T>[]
): SystemType<T> & { phase: number } {
  // don't wrap it in yet another sequence if we can avoid it
  return Object.assign(
    systems.length === 1 ? systems.shift()! : sequence(...systems),
    { phase: id }
  );
}
