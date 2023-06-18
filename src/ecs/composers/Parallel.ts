import type { Plugins, SystemType } from '../../types';
import type { SystemClass } from '../System';

import { Pipeline } from './Pipeline';

interface Runner<T> {
  (item: T): Promise<unknown>;
}

/**
 * Return a single system composed of multiple systems to be run in parallel,
 * resolving once all systems have been resolved.
 */
export function parallel<T extends Plugins<T>>(...Systems: SystemType<T>[]): SystemClass<T> {
  return class Parallel extends Pipeline<T> {
    protected static async run<T>(items: T[], fn: Runner<T>): Promise<void> {
      await Promise.allSettled(items.reduce((a: Promise<unknown>[], b) => a.concat(fn(b)), []));
    }

    public async tick(dt: number, ts: number): Promise<void> {
      await Parallel.run(this.systems, async system => system.tick?.(dt, ts));
      this.ctx.manager.tick();
    }

    public async start(): Promise<void> {
      this.addSystems(Systems);
      return super.start();
    }
  };
}
