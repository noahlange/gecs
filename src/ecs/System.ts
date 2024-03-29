import type { OfOrPromiseOf, Plugins } from '../types';
import type { Context } from './Context';

export interface SystemClass<T> {
  phase?: number;
  new (ctx: Context<T>): System<T>;
}

export interface SystemFunction<T extends Plugins<T>> {
  (ctx: Context<T>, delta: number, ts: number): void;
  phase?: number;
}

export interface SystemLike {
  tick?(dt: number, ts: number): void;
  start?(): OfOrPromiseOf<unknown>;
  stop?(): OfOrPromiseOf<unknown>;
}

export class System<T extends Plugins<T> = {}> {
  public ctx: Context<T>;

  public tick?(delta: number, ts: number): void;
  public start?(): OfOrPromiseOf<unknown>;
  public stop?(): OfOrPromiseOf<unknown>;

  public constructor(ctx: Context<T>) {
    this.ctx = ctx;
  }
}
