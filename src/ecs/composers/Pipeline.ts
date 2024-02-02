import type { Context, SystemType } from '../../';
import type { Plugins } from '../../types';
import type { SystemLike } from '../System';

import { isSystemConstructor } from '../../utils';
import { System } from '../System';

export abstract class Pipeline<T extends Plugins<T>> extends System<T> {
  public systems: SystemLike[] = [];

  public tick(dt: number, ts: number): void {
    for (const system of this.systems) {
      system.tick?.(dt, ts);
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
    this.systems = systems.flat(1).map(System => {
      return isSystemConstructor(System) ? new System(this.ctx) : { tick: (dt, ts) => System(this.ctx, dt, ts) };
    });
  }

  public constructor(context: Context<T>, ...systems: SystemLike[]) {
    super(context);
    this.systems = systems;
  }
}
