import type { U } from 'ts-toolbelt';
import type { Contained, ContainedClass } from './lib/Contained';

export type KeyedByType<A extends ContainedClass[]> = U.Merge<
  A extends (infer R)[]
    ? R extends ContainedClass
      ? Record<R['type'], InstanceType<R>>
      : never
    : never
>;
export interface BaseType {
  [key: string]: Contained;
}
