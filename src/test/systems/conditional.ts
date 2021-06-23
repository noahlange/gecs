import { describe, expect, test } from '@jest/globals';

import { conditional, Context, sequence } from '../../ecs';

interface ContextState {
  value: number;
}

const a = conditional<ContextState>(
  ctx => ctx.state.value === 0,
  sequence(ctx => (ctx.state.value += 25))
);

const b = conditional<ContextState>(
  ctx => ctx.state.value === 0,
  sequence(ctx => (ctx.state.value += 250))
);

const c = conditional<ContextState>(
  ctx => ctx.state.value > 0,
  ctx => (ctx.state.value += 100)
);

describe('conditional systems', () => {
  const MyContext = class extends Context.with<ContextState>(a, b, c) {};

  test('should only run when a condition evaluates to true', async () => {
    const world = new MyContext({ value: 0 });
    await world.start();
    expect(world.state.value).toBe(125);
  });
});
