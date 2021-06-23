import { describe, expect, test } from '@jest/globals';

import { Context } from '../../ecs';

interface ContextState {
  value: number;
}

const systemA = (ctx: Context<ContextState>): void => {
  ctx.state.value += 1;
};

const systemB = (ctx: Context<ContextState>): void => {
  ctx.state.value += 2;
};

class MyContext extends Context.with<ContextState>(systemA, systemB) {}

describe('stateless function systems', () => {
  test('should execute properly', async () => {
    const world = new MyContext({ value: 0 });
    await world.start();

    expect(world.state.value).toBe(3);
  });
});
