import type { Component, ComponentClass, Entity, EntityClass } from './ecs';
import type { EntityRef } from './ecs/EntityRef';
import type { U } from 'ts-toolbelt';

// There's certainly a better way to handle this, but it appears to behave consistently enough—at least in Chrome.
export const anonymous = '_a';
export const eid = '$id$';

export interface SerializedEntity {
  id: string;
  type: string;
  tags: string[];
  $: Record<string, unknown>;
}

export interface Serialized {
  entities: SerializedEntity[];
}

/**
 * avoidable `any`s that should be rewritten.
 */
export type $AnyEvil = any;

/**
 * `any`s that are unavoidable.
 */
export type $AnyOK = any;

export type KeyedByType<A extends WithStaticType[]> = U.Merge<
  A extends (infer B)[]
    ? B extends WithStaticType
      ? {
          [key in B['type']]: InstanceType<B> extends EntityRef
            ? Ref<InstanceType<B>> | null
            : InstanceType<B>;
        }
      : never
    : never
>;

export type PartialByType<A extends WithStaticType[]> = U.Merge<
  A extends (infer B)[]
    ? B extends WithStaticType
      ? {
          [key in B['type']]?: InstanceType<B> extends EntityRef
            ? Ref<InstanceType<B>> | null
            : InstanceType<B>;
        }
      : never
    : never
>;

export interface WithStaticType<T = $AnyOK> {
  readonly type: string;
  new (...args: $AnyOK[]): T;
}

export interface BaseType<T extends Component = {}> {
  [key: string]: T | null;
}

export type PartialContained<T> = {
  [K in Exclude<keyof T, 'container'>]?: T[K];
};

export type Ref<T> = T extends EntityRef<infer R> ? R : T;

export type BaseDataType<T extends BaseType> = {
  [K in keyof T]?: T[K] extends EntityRef
    ? Ref<T[K]> | null
    : PartialContained<T[K]>;
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

export enum Tag {
  TO_DESTROY = 'TO_DESTROY',
  TO_PERSIST = 'TO_PERSIST'
}

export interface SomeHash {
  [key: string]: unknown;
}

export interface QueryStep {
  ids: string[];
  tag: QueryTag;
  key: string;
}

export type EntityType<
  A extends ComponentClass[],
  O extends ComponentClass[] = []
> = Entity<U.Merge<KeyedByType<A> & PartialByType<O>>>;

export type FullDataType<T> = T extends EntityClass<infer D> ? D : never;

export type DataType<T> = T extends EntityClass<infer D>
  ? BaseDataType<D>
  : never;
