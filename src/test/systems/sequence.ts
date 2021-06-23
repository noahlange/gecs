import { describe, expect, test } from '@jest/globals';

import { Context, sequence } from '../../ecs';

interface ContextState {
  value: number;
}

const system = sequence(
  (ctx: Context<ContextState>) => {
    ctx.state.value += 3;
  },
  (ctx: Context<ContextState>) => {
    ctx.state.value **= 2;
  }
);

class MyContext extends Context.with<ContextState>(system) {}

describe('sequences of systems', () => {
  test('should execute sequentially', async () => {
    const world = new MyContext({ value: 0 });
    await world.start();
    expect(world.state.value).toBe(9);
  });
});
