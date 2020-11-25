import { id } from '../utils';
import type { Entity } from './Entity';

export interface ComponentType<T> {
  readonly type: string;
  new (parent: Entity): Component;
}

export class Component {
  public static readonly type: string;
  public readonly id: string = id();
  public entity: Entity;

  public constructor(entity: Entity) {
    this.entity = entity;
  }
}
