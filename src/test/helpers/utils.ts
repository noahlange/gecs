import type { OfOrPromiseOf } from '../../types';

interface Tickable {
  tick(...args: any[]): OfOrPromiseOf<void>;
}

export async function withTick<T>(
  tickable: Tickable,
  callback: () => OfOrPromiseOf<T>
): Promise<T> {
  await tickable.tick();
  const res = await callback();
  await tickable.tick();
  return res;
}
