import type { ContainedClass } from '../../lib';
import type { PartialContained } from '../../types';

import { Contained } from '../../lib/Contained';

export interface ComponentClass extends ContainedClass {
  readonly type: string;
  new (data: PartialContained<Component>): Component;
}

export class Component extends Contained {}
