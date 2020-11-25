import type { Entity } from './Entity';

export interface ComponentType<T> {
  readonly type: string;
  new (parent: Entity<T>): Component;
}

export class Component {
  public static readonly type: string;
  public entity: Entity<unknown>;

  public constructor(entity: Entity<unknown>) {
    this.entity = entity;
  }
}
