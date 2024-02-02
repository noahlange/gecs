/* eslint-disable max-classes-per-file */
import { describe, expect, vi, test } from 'vitest';

import { Component, Entity } from '..';
import { getContext, withTick } from '../test/helpers';
import * as C from '../test/helpers/components';
import * as E from '../test/helpers/entities';

describe('save and load', () => {
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
    const e = ctx2.query.components(E).first();

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
    const e = ctx2.query.components(C.D).first();

    expect(e).not.toBeNull();
    expect(e?.$.d.value).toEqual(12345n);
  });

  test('reattaches entity refs', async () => {
    const [ctx1, ctx2] = [getContext(), getContext()];

    await withTick(ctx1, () => {
      const a = ctx1.create(E.WithRef);
      const b = ctx1.create(E.WithA);
      a.$.ref = b;
    });

    const saved = ctx1.save();

    await withTick(ctx2, () => ctx2.load(saved));

    const a2 = ctx2.query.components(C.Ref).first();
    const b2 = ctx2.query.components(C.A).first();

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

  const spy = vi.spyOn(console, 'warn').mockImplementation(() => void 0);
  ctx2.load(ctx1.save());
  expect(console.warn).toHaveBeenCalledWith('Missing entities/components: e');
  spy.mockRestore();
});
