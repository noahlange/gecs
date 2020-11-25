import type { Entity } from './Entity';

export interface ComponentType<T> {
  readonly type: string;
  new (parent: Entity): Component;
}

export class Component {
  public static readonly type: string;
  public entity: Entity;

  public constructor(entity: Entity) {
    this.entity = entity;
  }
}
