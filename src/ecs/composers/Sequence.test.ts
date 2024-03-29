import { describe, expect, test } from 'vitest';

import { Context } from '../../';
import { SequenceState } from '../../test/helpers/plugins';

const MyContext = Context.with(SequenceState);

describe('sequences of systems', () => {
  test('should execute sequentially', async () => {
    const ctx = new MyContext();
    await ctx.start();
    ctx.tick();
    expect(ctx.$.state.value).toBe(9);
  });
});
