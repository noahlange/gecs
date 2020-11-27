import { nanoid } from 'nanoid';

export interface ContainedClass {
  readonly type: string;
  new (...args: unknown[]): Contained;
}

export class Contained {
  public readonly id: string = nanoid();
}
