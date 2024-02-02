import { describe, expect, test } from '@jest/globals';

import { ConditionalState } from '../../test/helpers/plugins';
import { Context } from '../';

describe('conditional systems', () => {
  const MyContext = Context.with(ConditionalState);

  test('should only run when a condition evaluates to true', async () => {
    const ctx = new MyContext();
    await ctx.start();
    ctx.tick();
    expect(ctx.$.state.value).toBe(125);
  });
});
