import type { OfOrPromiseOf } from '../types';
import type { Context } from './Context';

export interface SystemClass<T extends {} = {}> {
  ofType<T>(): SystemClass<T>;
  new (ctx: Context<T>): System<T>;
}

export interface SystemFunction<T extends {} = {}> {
  (ctx: Context<T>, delta: number, ts: number): OfOrPromiseOf<unknown>;
}

export interface SystemLike {
  tick?(dt: number, ts: number): OfOrPromiseOf<unknown>;
  start?(): OfOrPromiseOf<unknown>;
  stop?(): OfOrPromiseOf<unknown>;
}

export class System<T extends {} = {}> {
  public static ofType<T>(): SystemClass<T> {
    return this as SystemClass<T>;
  }

  public tick?(delta: number, ts: number): OfOrPromiseOf<unknown>;
  public start?(): OfOrPromiseOf<unknown>;
  public stop?(): OfOrPromiseOf<unknown>;

  public ctx: Context<T>;

  public constructor(ctx: Context<T>) {
    this.ctx = ctx;
  }
}
