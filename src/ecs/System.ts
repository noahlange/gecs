import type { World } from './World';

export interface SystemClass {
  type: string;
  new (world: World): System;
}

export class System {
  public static readonly type: string;

  public tick?(delta: number, ts: number): void;
  public init?(): void | Promise<void>;

  public world: World;

  public constructor(world: World) {
    this.world = world;
  }
}
