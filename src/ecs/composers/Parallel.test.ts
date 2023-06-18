/* eslint-disable max-classes-per-file */

import { describe, expect, test } from '@jest/globals';

import { ParallelState } from '../../test/helpers/plugins';
import { Context } from '../';

describe('parallel systems', () => {
  const MyContext = Context.with(ParallelState);
  test('should, by default, execute systems sequentially', async () => {
    const ctx = new MyContext();
    await ctx.start();
    await ctx.tick();
    expect(ctx.$.state.value).toBe(3);
  });
});
