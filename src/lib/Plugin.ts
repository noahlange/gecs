/* eslint-disable max-classes-per-file */
import type { Context } from '../ecs';
import type { OfOrPromiseOf, PluginData, Plugins } from '../types';

export interface PluginClass<T extends Plugins<T>> {
  readonly type: string;
  new (context: Context<T>): Plugin<T>;
}

export class Plugin<T extends Plugins<T> = {}> {
  public static readonly type: string;

  protected ctx: Context<T>;

  public $?: PluginData<T>;

  public start?(): OfOrPromiseOf<unknown>;
  public stop?(): OfOrPromiseOf<unknown>;

  public constructor(ctx: Context<T>) {
    this.ctx = ctx;
  }
}
