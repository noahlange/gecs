/* eslint-disable max-classes-per-file */
import type { Serialized } from '../types';

import { describe, expect, test, vi } from 'vitest';

import { Component, Entity } from '..';
import { getContext, withTick } from '../test/helpers';
import * as C from '../test/helpers/components';
import * as E from '../test/helpers/entities';

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

    expect(Array.from(ctx2.query.components(C.A, C.B))).toHaveLength(5);

    for (const entity of ctx2.query.components(C.A, C.B)) {
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
});

test('serialize null refs', async () => {
  const [ctx1, ctx2] = [getContext(), getContext()];
  await withTick(ctx1, () => ctx1.create(E.WithRef, { ref: null }));
  const saved = ctx1.save();
  await withTick(ctx2, () => ctx2.load(saved));
  const a2 = ctx2.query.components(C.Ref).first();
  expect(a2?.$.ref).toBeNull();
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
