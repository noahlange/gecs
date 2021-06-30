import type { OfOrPromiseOf } from '../types';
import type { Context } from './Context';

export interface SystemClass<C extends {} = {}> {
  priority?: number;
  ofType<C>(): SystemClass<C>;
  new (ctx: Context<C>): System<C>;
}

export interface SystemFunction<C extends {} = {}> {
  priority?: number;
  (ctx: Context<C>, delta: number, ts: number): OfOrPromiseOf<unknown>;
}

export interface SystemLike {
  tick?(dt: number, ts: number): OfOrPromiseOf<unknown>;
  start?(): OfOrPromiseOf<unknown>;
  stop?(): OfOrPromiseOf<unknown>;
}

export class System<C extends {} = {}> {
  public static ofType<C>(): SystemClass<C> {
    return this as SystemClass<C>;
  }

  public tick?(delta: number, ts: number): OfOrPromiseOf<unknown>;
  public start?(): OfOrPromiseOf<unknown>;
  public stop?(): OfOrPromiseOf<unknown>;

  public ctx: Context<C>;

  public constructor(ctx: Context<C>) {
    this.ctx = ctx;
  }
}
