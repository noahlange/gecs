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
 * reference to another entity. Read/write operations to this component are
 * proxied directly to the value of the `ref` property. An EntityRef takes two
 * optional type parameters, T and S.
 *   - T indicates the type of the target entity (reference _to_)
 *   - S indicates the type of the source entity (referenced _from_)
 */
export class EntityRef<T extends Entity = Entity, S extends Entity = Entity> {
  public static readonly type: string;

  public ref: T | null = null;
  public entity: S | null = null;

  public constructor(ref?: T) {
    this.ref = ref ?? null;
  }
}
