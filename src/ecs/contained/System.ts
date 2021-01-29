import type { World } from '../container/World';
import type { ContainedClass } from '../../lib';

import { Contained } from '../../lib/Contained';
import type { PartialContained } from '../../types';

export interface SystemClass extends ContainedClass {
  readonly type: string;
  new (world: World, data: PartialContained<unknown>): System;
}

export abstract class System extends Contained {
  /** @virtual */
  public tick?(delta: number, time?: number): void;
  /** @virtual */
  public init?(): Promise<void> | void;

  /**
   * Public accessor for protected container property.
   */
  public get world(): World {
    return this.container as World;
  }
}
