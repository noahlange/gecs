import type { Plugins, SystemType } from '../../types';
import type { Context } from '../Context';
import type { SystemClass } from '../System';

import { Pipeline } from './Pipeline';

interface ConditionPredicate<T extends Plugins<T>> {
  (context: Context<T>): boolean;
}

/**
 * Given a predicate and arbitrary number of systems, return a single system that executes only when `predicate` returns truthy.
 */
export function conditional<T extends Plugins<T>>(
  predicate: ConditionPredicate<T>,
  ...Systems: SystemType<T>[]
): SystemClass<T> {
  return class Conditional extends Pipeline<T> {
    public async tick(dt: number, ts: number): Promise<void> {
      for (const system of this.systems) {
        if (predicate(this.ctx)) {
          await system.tick?.(dt, ts);
        }
      }
      this.ctx.manager.tick();
    }

    public async start(): Promise<void> {
      this.addSystems(Systems);
      return super.start();
    }
  };
}
