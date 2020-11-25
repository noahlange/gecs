import type { U } from 'ts-toolbelt';

export interface Container<T> {}

export interface ContainerType<T> {
  new (): Container<T>;
}

export interface ContainedType {
  readonly type: string;
  new (...args: any): any;
}

export type KeyedByType<A extends ContainedType[]> = U.Merge<
  A extends (infer R)[]
    ? R extends ContainedType
      ? Record<R['type'], InstanceType<R>>
      : never
    : never
>;

export interface ConstructorType<C> {
  readonly type: string;
  new (...args: unknown[]): C;
}
