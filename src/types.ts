import type { U } from 'ts-toolbelt';
import type { Component, ComponentClass, Entity, EntityClass } from './ecs';

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
  mutation: Mutation;
}

export enum Mutation {
  NONE = 0,
  ADDED = 1,
  REMOVED = 2
}

export type EntityType<A extends ComponentClass[]> = Entity<KeyedByType<A>>;

export type FullDataType<T> = T extends EntityClass<infer D> ? D : never;

export type DataType<T> = T extends EntityClass<infer D>
  ? PartialBaseType<D>
  : never;
