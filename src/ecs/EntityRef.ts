import type { ComponentClass } from './Component';
import type { Entity } from './Entity';

export interface RefComponentClass extends ComponentClass {
  new (): EntityRef;
}

export interface PopulatedEntityRef<E extends Entity = Entity>
  extends EntityRef<E> {
  readonly entity: E;
}

export class EntityRef<E extends Entity = Entity> {
  public static readonly type: string;

  public ref: E | null = null;

  public constructor(ref?: E) {
    this.ref = ref ?? null;
  }
}
