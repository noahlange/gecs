import type { Manager } from '../..';

export function withTick(tickable: Manager, callback: () => void): void {
  tickable.tick();
  callback();
  tickable.tick();
}
