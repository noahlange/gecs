import { describe, expect, test } from '@jest/globals';

import { ThrottleState } from '../../test/helpers/plugins';
import { Context } from '../';

const MyContext = Context.with(ThrottleState);

describe('throttled systems', () => {
  test('should run', async () => {
    const ctx = new MyContext();
    await ctx.start();
    ctx.tick(), expect(ctx.$.state.value).toBe(1);
    ctx.tick(50), expect(ctx.$.state.value).toBe(2);
    ctx.tick(50), expect(ctx.$.state.value).toBe(3);
    ctx.tick(50), expect(ctx.$.state.value).toBe(8);
    ctx.tick(50), expect(ctx.$.state.value).toBe(9);
    ctx.tick(50), expect(ctx.$.state.value).toBe(20);
  });
});
