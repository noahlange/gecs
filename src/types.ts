import type {
  Component,
  ComponentClass,
  Entity,
  EntityClass,
  SystemClass
} from './ecs';
import type { EntityRef } from './ecs/EntityRef';
import type { SystemFunction } from './ecs/System';
import type { BaseQueryBuilder, PluginClass } from './lib';
import type { U } from 'ts-toolbelt';

// There's certainly a better way to handle this, but it appears to behave consistently enough—at least in Chrome...?
export const anonymous = '_a';
export const eid = '$id$';

export const Phase = {
  PRE_LOAD: 100,
  ON_LOAD: 200,
  POST_LOAD: 300,
  PRE_UPDATE: 400,
  ON_UPDATE: 500,
  POST_UPDATE: 600,
  PRE_RENDER: 700,
  ON_RENDER: 800,
  POST_RENDER: 900
} as const;

export interface PluginData<T> {
  entities?: EntityClass[] | Record<string, EntityClass>;
  components?: ComponentClass[] | Record<string, ComponentClass[]>;
  tags?: string[];
  systems?: SystemType<T>[];
}

/**
 * Utility types
 */

/**
 * avoidable `any`s that should be revisited and addressed.
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
 * Partial<T>, but recursive.
 */
export type DeepPartial<T> = {
  [K in keyof T]?: Partial<T[K]>;
};

/**
 * Data types for components and entities.
 */
export interface BaseType<T extends Component = {}> {
  [key: string]: T | null;
}

export type BaseDataType<T extends BaseType> = {
  [K in keyof T]?: T[K] extends EntityRef
    ? Ref<T[K]> | null
    : DeepPartial<T[K]>;
};

/**
 * Bare-bones data for an entity's components.
 */
export type DataType<T> = T extends EntityClass<infer D>
  ? BaseDataType<D>
  : never;

export type Plugins<T extends Plugins<T>> = {
  [K in keyof T]: T[K];
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
    : DeepPartial<InstanceType<A>>;

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
 * An arbitrary (stateless or stateful) system with context plugins of type T.
 */
export type SystemType<T extends Plugins<T>> =
  | SystemClass<T>
  | SystemFunction<T>;

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
> = BaseQueryBuilder<U.Merge<KeyedByType<R> & PartialByType<O>>>;

/**
 * A collection of plugins (and their dependencies).
 */
export type PluginDeps<A extends PluginClass<any>[]> = U.Merge<
  A extends (infer T)[]
    ? T extends PluginClass<infer R>
      ? U.Merge<R & { [K in T['type']]: InstanceType<T> }>
      : never
    : never
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

export interface Serialized {
  entities: SerializedEntity[];
}
