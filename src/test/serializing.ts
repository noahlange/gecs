/* eslint-disable max-classes-per-file */
import type { Serialized } from '../types';

import { describe, expect, jest, test } from '@jest/globals';

import { Component, Entity } from '../ecs';
import * as C from './helpers/components';
import * as E from './helpers/entities';
import { getContext } from './helpers/setup';
import { withTick } from './helpers/utils';

describe('save and load', () => {
  test("basics: doesn't explode", () => {
    const ctx = getContext();
    for (let i = 0; i < 5; i++) {
      ctx.create(E.WithA);
      ctx.create(E.cWithAB);
      ctx.create(E.WithRef);
    }

    let res: Serialized;

    expect(() => (res = ctx.save())).not.toThrow();
    expect(() => ctx.load(res)).not.toThrow();
  });

  test('recreates nested values', async () => {
    class E extends Component {
      public static readonly type = 'e';
      public a = { b: { c: { d: 3 } } };
    }

    const ctx1 = getContext();
    ctx1.register([], [E]);

    await withTick(ctx1, () => {
      const WithBigInt = Entity.with(E);
      const e = ctx1.create(WithBigInt);
      e.$.e.a.b.c.d = 6;
    });

    const saved = ctx1.save();

    const ctx2 = getContext();
    ctx2.register([], [E]);

    await withTick(ctx2, () => ctx2.load(saved));
    const e = ctx2.$.components(E).first();

    expect(e).not.toBeNull();
    expect(e?.$.e.a.b.c.d).toEqual(6);
  });

  test('recreates bigints', async () => {
    const ctx1 = getContext();

    await withTick(ctx1, () => {
      const WithBigInt = Entity.with(C.D);
      const e = ctx1.create(WithBigInt);
      e.$.d.value = 12345n;
    });

    const saved = ctx1.save();

    const ctx2 = getContext();

    await withTick(ctx2, () => ctx2.load(saved));
    const e = ctx2.$.components(C.D).first();

    expect(e).not.toBeNull();
    expect(e?.$.d.value).toEqual(12345n);
  });

  test('saves composed entities', async () => {
    const [ctx1, ctx2] = [getContext(), getContext()];

    await withTick(ctx1, () => {
      for (let i = 0; i < 5; i++) {
        ctx1.create(E.cWithAB);
        ctx1.tick(0, 0);
      }
    });

    const saved = ctx1.save();

    await withTick(ctx2, () => ctx2.load(saved));

    expect(Array.from(ctx2.$.components(C.A, C.B))).toHaveLength(5);

    for (const entity of ctx2.$.components(C.A, C.B)) {
      expect(entity).toBeInstanceOf(E.cWithAB);
    }
  });

  test('idempotent serializations', async () => {
    const [ctx1, ctx2] = [getContext(), getContext()];

    await withTick(ctx1, () => {
      for (let i = 0; i < 5; i++) {
        ctx1.create(E.cWithAB);
      }
    });

    const save1 = ctx1.save();
    await withTick(ctx2, () => ctx2.load(save1));

    const save2 = ctx2.save();
    expect(save1).toEqual(save2);
  });

  test('reattaches entity instances', async () => {
    const [ctx1, ctx2] = [getContext(), getContext()];

    await withTick(ctx1, () => {
      const a = ctx1.create(E.WithRef);
      const b = ctx1.create(E.WithA);
      a.$.ref = b;
    });

    const saved = ctx1.save();

    await withTick(ctx2, () => ctx2.load(saved));

    const a2 = ctx2.$.components(C.Ref).first();
    const b2 = ctx2.$.components(C.A).first();

    expect(a2).not.toBeNull();
    expect(b2).not.toBeNull();

    expect(a2!.$.ref).toBe(b2);
  });
});

test('warn when attempting to recreate unregistered components', async () => {
  class E extends Component {
    public static readonly type = 'e';
    public a = { b: { c: { d: 3 } } };
  }

  const [ctx1, ctx2] = [getContext(), getContext()];

  await withTick(ctx1, () => {
    ctx1.register([], [E], []);
    ctx1.create(Entity.with(E));
  });

  const spy = jest.spyOn(console, 'warn').mockImplementation(() => void 0);
  ctx2.load(ctx1.save());
  expect(console.warn).toHaveBeenCalledWith('Missing entities/components: e');
  spy.mockRestore();
});
