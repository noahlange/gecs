import type { $AnyEvil } from '../types';

export interface ComponentClass {
  readonly type: string;
  new (data?: $AnyEvil): Component;
}

export class Component {
  public static readonly type: string;
}
