import type { Container } from './Container';

import { nanoid } from 'nanoid/non-secure';

export interface ContainedClass {
  readonly type: string;
  new (): Contained;
}

export class Contained {
  public static readonly type: string;
  public readonly id: string = nanoid(10);

  /**
   * Parent container of contained item.
   *
   * @privateRemarks
   * This is defined at runtime using `Object.defineProperty()`.
   */
  protected readonly container!: Container;
}
