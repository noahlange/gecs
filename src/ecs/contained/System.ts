import type { World } from '../container/World';
import type { ContainedClass } from '../../lib';

import { Contained } from '../../lib/Contained';

export interface SystemClass extends ContainedClass {
  readonly type: string;
  new (world: World): System;
}

export abstract class System extends Contained {
  public abstract tick(delta: number, time?: number): void;
  public init?(): void;

  public get world(): World {
    return this.container as World;
  }
}
