import type { U } from 'ts-toolbelt';

import type { Contained } from './lib';
import type { EntityClass } from './ecs/container/Entity';

export type KeyedByType<A extends WithStaticType[]> = U.Merge<
  A extends (infer R)[]
    ? R extends WithStaticType
      ? { [key in R['type']]: InstanceType<R> }
      : never
    : never
>;

export type PartialByType<A extends WithStaticType[]> = U.Merge<
  A extends (infer R)[]
    ? R extends WithStaticType
      ? { [key in R['type']]?: InstanceType<R> }
      : never
    : never
>;

export interface WithStaticType<T = any> {
  readonly type: string;
  new (...args: any[]): T;
}

export interface BaseType<T = Contained> {
  [key: string]: T;
}

export type PartialContained<T> = {
  [K in Exclude<keyof T, 'container'>]?: T[K];
};

export type PartialBaseType<T extends BaseType> = {
  [K in keyof T]?: PartialContained<T[K]>;
};

export type Frozen<T extends BaseType> = {
  readonly [K in keyof T]: Readonly<T[K]>;
};

export type DataType<T> = T extends EntityClass<infer D>
  ? PartialBaseType<D>
  : never;
