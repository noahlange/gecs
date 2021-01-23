import type { Entity } from '../container/Entity';
import type { ContainedClass } from '../../lib';

import { Contained } from '../../lib';

export interface ComponentClass extends ContainedClass {
  readonly type: string;
  new (container: Entity): Component;
}

export class Component extends Contained {}
