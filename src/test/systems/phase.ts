/* eslint-disable max-classes-per-file */

import { describe, expect, test } from '@jest/globals';

import { Context } from '../../ecs';
import { phase } from '../../ecs/composers';
import { Plugin } from '../../lib';
import { Phase } from '../../types';
import { PhaseState } from '../helpers/plugins';

describe('system phases', () => {
  test('sort systems ascending', async () => {
    const ctx = new (Context.with(PhaseState))();
    await ctx.start();
    expect(ctx.game.phase.value).toBe(3);
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
    await ctx.stop();

    expect(calls).toEqual(['b', 'a']);
  });
});
