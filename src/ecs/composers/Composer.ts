import type { Plugins, SystemType } from '../../types';
import type { SystemClass } from '../System';

import { Pipeline } from './Pipeline';

/**
 * Return a system composed of multiple systems to be run one after another,
 * pausing to resolve if necessary.
 */
export function compose<T extends Plugins<T>>(
  ...Systems: SystemType<T>[]
): SystemClass<T> {
  return class Composer extends Pipeline<T> {
    public async start(): Promise<void> {
      this.addSystems(Systems);
      return super.start();
    }
  };
}
