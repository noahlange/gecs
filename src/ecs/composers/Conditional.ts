import type { Plugins, SystemType } from '../../types';
import type { Context } from '../Context';
import type { SystemClass, SystemLike } from '../System';

import { System } from '../System';
import { sequence } from './Sequence';

interface ConditionPredicate<T extends Plugins<T>> {
  (context: Context<T>): boolean;
}

/**
 * Given a predicate and arbitrary number of systems, return a single system that executes only when `predicate` returns truthy.
 */
export function conditional<T extends Plugins<T>>(
  predicate: ConditionPredicate<T>,
  ...systems: SystemType<T>[]
): SystemClass<T> {
  const system = sequence(...systems);

  return class ConditionSystem extends System<any> {
    protected system: SystemLike = new system(this.ctx);

    public async tick(dt: number, ts: number): Promise<void> {
      if (predicate(this.ctx)) {
        await this.system.tick?.(dt, ts);
      }
      this.ctx.manager.tick();
    }

    public async stop(): Promise<void> {
      await this.system.stop?.();
      this.ctx.manager.tick();
    }

    public async start(): Promise<void> {
      await this.system.start?.();
      this.ctx.manager.tick();
    }
  };
}
