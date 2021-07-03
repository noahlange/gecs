import type { Serialized } from '../types';

import { describe, expect, test } from '@jest/globals';

import { Context } from '../ecs';
import * as C from './helpers/components';
import * as E from './helpers/entities';
import { withTick } from './helpers/utils';

function setup(): Context {
  const ctx = new Context({});
  ctx.register({ ...C, ...E });
  return ctx;
}

describe('save and load', () => {
  test("basics: doesn't explode", () => {
    const ctx = setup();
    for (let i = 0; i < 5; i++) {
      ctx.create(E.WithA);
      ctx.create(E.cWithAB);
      ctx.create(E.WithRef);
    }

    let res: Serialized;

    expect(() => (res = ctx.save())).not.toThrow();
    expect(() => ctx.load(res)).not.toThrow();
  });

  test('saves composed entities', async () => {
    const [ctx1, ctx2] = [setup(), setup()];

    await withTick(ctx1, () => {
      for (let i = 0; i < 5; i++) {
        ctx1.create(E.cWithAB);
      }
    });

    ctx1.manager.tick();

    const saved = ctx1.save();

    await withTick(ctx2, () => ctx2.load(saved));

    expect(Array.from(ctx2.$.components(C.A, C.B))).toHaveLength(5);

    for (const entity of ctx2.$.components(C.A, C.B)) {
      expect(entity).toBeInstanceOf(E.cWithAB);
    }
  });

  test('idempotent serializations', () => {
    const [ctx1, ctx2] = [setup(), setup()];
    for (let i = 0; i < 5; i++) {
      ctx1.create(E.cWithAB);
    }

    const save1 = ctx1.save();
    ctx2.load(save1);
    const save2 = ctx2.save();

    expect(save1).toEqual(save2);
  });

  test('reattaches entity instances', async () => {
    const [ctx1, ctx2] = [setup(), setup()];

    const a = ctx1.create(E.WithRef);
    const b = ctx1.create(E.WithA);
    a.$.ref = b;

    await ctx1.tick(0, 0);
    const saved = ctx1.save();

    ctx2.load(saved);
    await ctx2.tick(0, 0);

    const a2 = ctx2.$.components(C.Ref).first();
    const b2 = ctx2.$.components(C.A).first();

    expect(a2).not.toBeNull();
    expect(b2).not.toBeNull();

    expect(a2?.$.ref).toBe(b2);
  });
});
