import type { U } from 'ts-toolbelt';
import type { Component, ComponentClass, Entity, EntityClass } from './ecs';

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

export interface BaseType<T = Component> {
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

export enum QueryTag {
  SOME = 0,
  ALL = 1,
  ANY = 2,
  NONE = 3
}

export interface QueryStep {
  type: QueryType;
  tag: QueryTag;
  items: string[];
  key: string;
}

export enum QueryType {
  CMP = 1,
  ENT = 2,
  TAG = 3
}

export type EntityType<A extends ComponentClass[]> = Entity<KeyedByType<A>>;
