import type { U } from 'ts-toolbelt';
import type { Component, ComponentClass, Entity, EntityClass } from './ecs';

// I imagine there is a better way of handling this, but it appears to behave consistently enough—at least in Chrome.
export const anonymous = '_a';
export const eid = '$id$';

export type KeyedByType<A extends WithStaticType[]> = U.Merge<
  A extends (infer B)[]
    ? B extends WithStaticType
      ? { [key in B['type']]: InstanceType<B> }
      : never
    : never
>;

export type PartialByType<A extends WithStaticType[]> = U.Merge<
  A extends (infer B)[]
    ? B extends WithStaticType
      ? { [key in B['type']]?: InstanceType<B> }
      : never
    : never
>;

export interface WithStaticType<T = $AnyOK> {
  readonly type: string;
  new (...args: $AnyOK[]): T;
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

export type Primitive = string | number | boolean | null | bigint;
export type OfOrArrayOf<T> = T | T[];

export type Visiting = OfOrArrayOf<$AnyEvil>;
export type Visited = OfOrArrayOf<Primitive | SomeHash> | undefined;

export enum QueryTag {
  SOME = 0,
  ALL = 1,
  ANY = 2,
  NONE = 3
}

export interface SomeHash {
  [key: string]: unknown;
}

export interface QueryStep {
  ids: string[];
  tag: QueryTag;
  key: string;
}

export type EntityType<A extends ComponentClass[]> = Entity<KeyedByType<A>>;

export type FullDataType<T> = T extends EntityClass<infer D> ? D : never;

export type DataType<T> = T extends EntityClass<infer D>
  ? PartialBaseType<D>
  : never;
