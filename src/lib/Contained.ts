import type { Container } from './Container';

import { nanoid } from 'nanoid/non-secure';

export interface ContainedClass {
  readonly type: string;
  new (container: Container): Contained;
}

export class Contained {
  public static readonly type: string;
  public readonly id: string = nanoid();
  public container: Container;
  public constructor(container: Container) {
    this.container = container;
  }
}
