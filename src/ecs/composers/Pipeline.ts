import type { SystemType } from '../../types';
import type { SystemLike } from '../System';

import { isSystemConstructor } from '../../utils';
import { System } from '../System';

export abstract class Pipeline<T> extends System<T> {
  public systems: SystemLike[] = [];

  public async tick(dt: number, ts: number): Promise<void> {
    for (const system of this.systems) {
      await system.tick?.(dt, ts);
      this.ctx.manager.tick();
    }
  }

  public async stop(): Promise<void> {
    for (const system of this.systems) {
      await system.stop?.();
      this.ctx.manager.tick();
    }
  }

  public async start(): Promise<void> {
    for (const system of this.systems) {
      await system.start?.();
      this.ctx.manager.tick();
    }
  }

  protected addSystems(systems: SystemType<T>[]): void {
    this.systems = systems.flatMap(System => {
      return isSystemConstructor(System)
        ? new System(this.ctx)
        : { tick: (dt, ts) => System(this.ctx, dt, ts) };
    });
  }
}