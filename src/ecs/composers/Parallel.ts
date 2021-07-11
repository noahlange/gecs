import type { Plugins, SystemType } from '../../types';
import type { SystemClass, SystemLike } from '../System';

import { isSystemConstructor } from '../../utils';
import { System } from '../System';

interface Runner<T> {
  (item: T): Promise<unknown>;
}

async function run<T>(items: T[], fn: Runner<T>): Promise<void> {
  await Promise.all(
    items.reduce((a: Promise<unknown>[], b) => a.concat(fn(b)), [])
  );
}

/**
 * Return a single system composed of multiple systems to be run in parallel,
 * resolving once all systems have been resolved.
 */
export function parallel<T extends Plugins<T>>(
  ...Systems: SystemType<T>[]
): SystemClass<T> {
  return class ParallelSystem extends System<T> {
    public pipeline: SystemLike[] = [];

    public async tick(dt: number, ts: number): Promise<void> {
      await run(this.pipeline, async system => system.tick?.(dt, ts));
      this.ctx.manager.tick();
    }

    public async stop(): Promise<void> {
      await run(this.pipeline, async system => system.stop?.());
      this.ctx.manager.tick();
    }

    public async start(): Promise<void> {
      this.pipeline = Systems.map(System => {
        return isSystemConstructor(System)
          ? new System(this.ctx)
          : { tick: (dt, ts) => System(this.ctx, dt, ts) };
      });
      await run(this.pipeline, async system => system.start?.());
      this.ctx.manager.tick();
    }
  };
}
