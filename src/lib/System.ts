import { id } from '../utils';
import type { World } from './World';

export interface SystemType {
  readonly type: string;
  new (world: World): System;
}

export abstract class System {
  public static readonly type: string;
  public readonly id = id();
  public world: World;

  public abstract execute(delta: number, time?: number): void;
  public abstract init(): void;

  public constructor(world: World) {
    this.world = world;
  }
}
