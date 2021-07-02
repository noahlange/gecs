import type {
  Component,
  ComponentClass,
  Entity,
  EntityClass,
  SystemClass
} from './ecs';
import type { EntityRef } from './ecs/EntityRef';
import type { SystemFunction } from './ecs/System';
import type { BaseQueryBuilder } from './lib/QueryBuilder';
import type { U } from 'ts-toolbelt';

// There's certainly a better way to handle this, but it appears to behave consistently enough—at least in Chrome...?
export const anonymous = '_a';
export const eid = '$id$';

/**
 * Utility types
 */

/**
 * avoidable `any`s that should be revisited and fixed.
 */
export type $AnyEvil = any;

/**
 * `any`s that are (AFAIK) unavoidable.
 */
export type $AnyOK = any;

/**
 * Any value that can be serialized in JSON (along with bigints).
 */
export type Primitive = string | number | boolean | null | bigint;
export type OfOrArrayOf<T> = T | T[];
export type OfOrPromiseOf<T> = T | Promise<T>;

/**
 * Data types for components and entities.
 */
export interface BaseType<T extends Component = {}> {
  [key: string]: T | null;
}

export type BaseDataType<T extends BaseType> = {
  [K in keyof T]?: T[K] extends EntityRef
    ? Ref<T[K]> | null
    : PartialComponentData<T[K]>;
};

export type DataType<T> = T extends EntityClass<infer D>
  ? BaseDataType<D>
  : never;

export type PartialComponentData<T> = {
  [K in Exclude<keyof T, 'container'>]?: Partial<T[K]>;
};

/**
 * Some class with a static, readonly `type` property.
 */
export interface WithStaticType<T = $AnyOK> {
  readonly type: string;
  new (...args: $AnyOK[]): T;
}

/**
 * Given an array of WithStaticTypes, return a merged array of key-value pairs with required values.
 *
 * @typedef A - array of component classes (or other things with a static readonly `type` property) to be required
 *
 * @example
 * class A extends Component { static readonly type: 'a' }
 * class B extends Component { static readonly type: 'b' }
 * type KeyedByType<[typeof A, typeof B]> // { a: A, b: B }
 */
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

/**
 * Given an array of WithStaticTypes, return a merged array of key-value pairs, with optional values.
 *
 * @typedef A - array of component classes (or other things with a static readonly `type` property)
 *
 * @example
 * class A extends Component { static readonly type: 'a' }
 * class B extends Component { static readonly type: 'b' }
 * type PartialByType<[typeof A, typeof B]> // { a?: A, b?: B }
 */
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

/**
 * Given an array of WithStaticTypes, return a merged array of key-value pairs, all with `never` value types
 *
 * @typedef A - array of component classes (or other things with a static readonly `type` property) to be excluded
 *
 * @example
 * class A extends Component { static readonly type: 'a' }
 * class B extends Component { static readonly type: 'b' }
 * type NeverByType<[typeof A, typeof B]> // { a: never, b: never }
 */
export type NeverByType<A extends WithStaticType[]> = U.Merge<
  A extends (infer B)[]
    ? B extends WithStaticType
      ? { [key in B['type']]: never }
      : never
    : never
>;

/**
 * Used to define the contents of an entity payload: pass a data partial for a Component and an entity for an EntityRef.
 * - given an EntityRef, return the type of the referenced entity.
 * - given an ordinary component, return the partial type of its data.
 */
export type PartialValueByType<A extends WithStaticType> =
  InstanceType<A> extends EntityRef<infer R>
    ? R | null
    : PartialComponentData<InstanceType<A>>;

/**
 * Given an EntityRef, returns the type of the entity.
 */
export type Ref<T> = T extends EntityRef<infer R> ? R : never;

/**
 * Constraint for a given query step.
 */
export enum Constraint {
  SOME = 0,
  ALL = 1,
  ANY = 2,
  NONE = 3
}

export enum QueryStatus {
  NONE = 0,
  PENDING = 1,
  RESOLVED = 2,
  FAILED = 3
}

export interface QueryStep {
  ids: string[];
  constraint: Constraint;
}

/**
 * An arbitrary (stateless or stateful) system with a Context state type of C.
 */
export type SystemType<C = {}> = SystemClass<C> | SystemFunction<C>;

/**
 * An entity with required components and/or optional components
 * @typeParam R - array of required component types
 * @typeParam O - array of optional component types
 */
export type EntityType<
  R extends ComponentClass[] = [],
  O extends ComponentClass[] = []
> = Entity<U.Merge<KeyedByType<R> & PartialByType<O>>>;

export type QueryType<
  R extends ComponentClass[] = [],
  O extends ComponentClass[] = []
> = BaseQueryBuilder<
  U.Merge<KeyedByType<R> & PartialByType<O>>,
  EntityType<R, O>
>;

/**
 * Catch-all types for serialization/deserialization.
 */

export type Visiting = OfOrArrayOf<$AnyEvil>;
export type Visited = OfOrArrayOf<Primitive | SomeDictionary> | undefined;

export interface SomeDictionary {
  [key: string]: unknown;
}

export interface SerializedEntity {
  id: string;
  type: string;
  tags: string[];
  $: Record<string, unknown>;
}

export interface Serialized<T extends {} = {}> {
  state: T;
  entities: SerializedEntity[];
}
