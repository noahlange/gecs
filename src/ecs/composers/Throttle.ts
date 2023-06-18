import type { Plugins, SystemType } from '../../types';
import type { SystemClass } from '../System';

import { Pipeline } from './Pipeline';

/**
 * Given a `ms` and list of systems, return a single system that executes once every `ms`.
 */
export function throttle<T extends Plugins<T>>(ms: number, ...Systems: SystemType<T>[]): SystemClass<T> {
  return class Throttle extends Pipeline<T> {
    protected elapsed = 0;

    public async tick(dt: number, ts: number): Promise<void> {
      this.elapsed += dt;
      if (this.elapsed >= ms) {
        for (const system of this.systems) {
          await system.tick?.(dt, ts);
          this.ctx.manager.tick();
        }
        this.elapsed -= ms;
      }
    }

    public async start(): Promise<void> {
      this.addSystems(Systems);
      return super.start();
    }
  };
}
