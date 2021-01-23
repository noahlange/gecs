import type { Container } from './Container';

import { nanoid } from 'nanoid/non-secure';

export interface ContainedClass<T extends Container = Container> {
  readonly type: string;
  new (container: T): Contained;
}

export class Contained<T extends Container = Container> {
  public static readonly type: string;
  public readonly id: string = nanoid();
  public container: T;
  public constructor(container: T) {
    this.container = container;
  }
}
