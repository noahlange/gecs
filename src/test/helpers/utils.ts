interface Tickable {
  tick(...args: any[]): void;
}

export function withTick(tickable: Tickable, callback: () => void): void {
  tickable.tick();
  callback();
  tickable.tick();
}
