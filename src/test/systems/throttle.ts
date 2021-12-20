import { describe, test } from '@jest/globals';

import { Context } from '../../';
import { ThrottleState } from '../helpers/plugins';

const MyContext = Context.with(ThrottleState);

describe('throttled systems', () => {
  test('should run', async () => {
    const ctx = new MyContext();
    await ctx.start();

    await ctx.tick();
    expect(ctx.$.state.value).toBe(1);

    await ctx.tick(50);
    expect(ctx.$.state.value).toBe(2);

    await ctx.tick(50);
    expect(ctx.$.state.value).toBe(3);

    await ctx.tick(50);
    expect(ctx.$.state.value).toBe(8);

    await ctx.tick(50);
    expect(ctx.$.state.value).toBe(9);

    await ctx.tick(50);
    expect(ctx.$.state.value).toBe(20);
  });
});
