interface Tickable {
  tick(...args: any[]): void | Promise<void>;
}

export async function withTick(
  tickable: Tickable,
  callback: () => unknown | Promise<unknown>
): Promise<void> {
  await tickable.tick();
  await callback();
  await tickable.tick();
}
