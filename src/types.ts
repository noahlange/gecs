import type { U } from 'ts-toolbelt';
import type { Component, ComponentClass, Entity, EntityClass } from './ecs';

export type OfOrArrayOf<T> = T | T[];

export type KeyedByType<A extends OfOrArrayOf<WithStaticType>[]> = U.Merge<
  A extends (infer B)[]
    ? B extends WithStaticType
      ? { [key in B['type']]: InstanceType<B> }
      : B extends (infer C)[]
      ? C extends WithStaticType
        ? { [key in C['type']]: InstanceType<C>[] }
        : never
      : never
    : never
>;

export type PartialByType<A extends OfOrArrayOf<WithStaticType>[]> = U.Merge<
  A extends (infer B)[]
    ? B extends WithStaticType
      ? { [key in B['type']]?: InstanceType<B> }
      : B extends (infer C)[]
      ? C extends WithStaticType
        ? { [key in C['type']]?: InstanceType<C>[] }
        : never
      : never
    : never
>;

export interface WithStaticType<T = any> {
  readonly type: string;
  new (...args: any[]): T;
}

export interface BaseType<T = Component> {
  [key: string]: T;
}

export type PartialContained<T> = {
  [K in Exclude<keyof T, 'container'>]?: T[K];
};

export type PartialBaseType<T extends BaseType> = {
  [K in keyof T]?: PartialContained<T[K]>;
};

export enum QueryTag {
  SOME = 0,
  ALL = 1,
  ANY = 2,
  NONE = 3
}

export interface QueryStep {
  ids: string[];
  tag: QueryTag;
  key: string;
}

export type EntityType<A extends ComponentClass[]> = Entity<KeyedByType<A>>;

export type DataType<T> = T extends EntityClass<infer D>
  ? PartialBaseType<D>
  : never;
