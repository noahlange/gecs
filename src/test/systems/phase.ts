/* eslint-disable max-classes-per-file */
import { describe, expect, test } from '@jest/globals';

import { Context, Phase, phase, Plugin } from '../../';
import { PhaseState } from '../helpers/plugins';

describe('system phases', () => {
  test('sort systems ascending', async () => {
    const ctx = new (Context.with(PhaseState))();
    await ctx.start();
    await ctx.tick();
    expect(ctx.$.state.value).toBe(3);
  });

  test('ties go in order of plugin registration', async () => {
    const calls: string[] = [];

    class PluginA extends Plugin {
      public static readonly type = 'a';
      public $ = {
        systems: [phase(Phase.ON_LOAD, () => calls.push('a'))]
      };
    }

    class PluginB extends Plugin {
      public static readonly type = 'b';
      public $ = {
        systems: [phase(Phase.ON_LOAD, () => calls.push('b'))]
      };
    }

    const ctx = new (Context.with(PluginB, PluginA))();
    await ctx.start();
    await ctx.tick();
    await ctx.stop();

    expect(calls).toEqual(['b', 'a']);
  });
});
