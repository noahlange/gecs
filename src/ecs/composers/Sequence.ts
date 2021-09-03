import type { $AnyEvil, Plugins, SystemType } from '../../types';

export function sequence<T extends Plugins<T>>(
  ...Systems: SystemType<T>[]
): SystemType<T> {
  // "Oh, I'm a bad man."
  //   - Malcolm Reynolds
  //     - Noah Lange
  return Systems.flatMap(s => s) as $AnyEvil as SystemType<T>;
}
