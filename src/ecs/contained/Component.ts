import type { ContainedClass } from '../../lib';
import type { Entity } from '../container/Entity';

import { Contained } from '../../lib/Contained';

export interface ComponentClass extends ContainedClass {
  readonly type: string;
  new (entity: Entity): Component;
}

export class Component extends Contained {}
