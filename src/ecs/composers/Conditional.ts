import type { SystemType } from '../../types';
import type { Context } from '../Context';
import type { SystemClass, SystemLike } from '../System';

import { isSystemConstructor } from '../../utils';
import { System } from '../System';

interface ConditionPredicate<T> {
  (context: Context<T>): boolean;
}

/**
 * Return a system that executes only when `predicate` returns truthy.
 */
export function conditional<T extends {} = {}>(
  predicate: ConditionPredicate<T>,
  system: SystemType<T>
): SystemClass<T> {
  return class ConditionSystem extends System<any> {
    protected system: SystemLike = isSystemConstructor(system)
      ? new system(this.ctx)
      : { tick: (dt, ts) => system(this.ctx, dt, ts) };

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
