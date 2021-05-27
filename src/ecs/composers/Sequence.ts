import type { SystemType } from '../../types';
import type { SystemClass, SystemLike } from '../System';

import { isSystemConstructor } from '../../utils';
import { System } from '../System';

interface Runner<T> {
  (item: T): Promise<void>;
}

function run<T>(items: T[], fn: Runner<T>): Promise<void> {
  return items.reduce((a, b) => a.then(() => fn(b)), Promise.resolve());
}

/**
 * Return a system composed of multiple systems to be run one after another,
 * pausing to resolve if necessary.
 */
export function sequence<T extends {} = {}>(
  ...Systems: SystemType<T>[]
): SystemClass<T> {
  return class SequenceSystem extends System<any> {
    public pipeline: SystemLike[] = [];

    public async tick(dt: number, ts: number): Promise<void> {
      await run(this.pipeline, async system => {
        await system.tick?.(dt, ts);
        this.ctx.manager.tick();
      });
    }

    public async stop(): Promise<void> {
      await run(this.pipeline, async system => {
        await system.stop?.();
        this.ctx.manager.tick();
      });
    }

    public async start(): Promise<void> {
      this.pipeline = Systems.map(System => {
        return isSystemConstructor(System)
          ? new System(this.ctx)
          : { tick: (dt, ts) => System(this.ctx, dt, ts) };
      });
      await run(this.pipeline, async system => {
        await system.start?.();
        this.ctx.manager.tick();
      });
    }
  };
}
