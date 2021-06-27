import type { ComponentClass } from './Component';
import type { Entity } from './Entity';

export interface RefComponentClass extends ComponentClass {
  new (): EntityRef;
}

export interface PopulatedEntityRef<E extends Entity = Entity>
  extends EntityRef<E> {
  readonly entity: E;
}

/**
 * An EntityRef is a special type of component that contains a nullable
 * reference to another entity. Access to this component is proxied directly to
 * its `ref` property.
 */
export class EntityRef<E extends Entity = Entity> {
  public static readonly type: string;

  public ref: E | null = null;

  public constructor(ref?: E) {
    this.ref = ref ?? null;
  }
}
