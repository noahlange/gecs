import type { U } from 'ts-toolbelt';
import type { Contained } from './lib';

export type KeyedByType<A extends WithStaticType[]> = U.Merge<
  A extends (infer R)[]
    ? R extends WithStaticType
      ? Record<R['type'], InstanceType<R>>
      : never
    : never
>;

export interface WithStaticType {
  readonly type: string;
  new (...args: any[]): any;
}

export interface BaseType<T = Contained> {
  [key: string]: T;
}
