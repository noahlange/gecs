import type { Entity } from '../ecs';

import { describe, expect, test } from 'vitest';

import { getContext, withTick } from '../test/helpers';
import { A, B, C } from '../test/helpers/components';
import { WithA, WithAB } from '../test/helpers/entities';

describe('caching', () => {
  test("make sure a restricted result set doesn't inadvertently filter larger result sets", async () => {
    const ctx = getContext();

    await withTick(ctx, () => {
      ctx.create(WithA, {}, ['a', 'b', 'c']);
      ctx.create(WithAB, {});
    });

    const a = ctx.query.tags('a').components(A);
    const b = ctx.query.components(A);

    expect(a.get()).toHaveLength(1);
    expect(b.get()).toHaveLength(2);
  });

  test('created entities should be added to cached result sets', async () => {
    const ctx = getContext();
    const q = ctx.query.components(A);

    await withTick(ctx, () => ctx.create(WithA));
    expect(q.get()).toHaveLength(1);

    await withTick(ctx, () => ctx.create(WithAB));
    expect(q.get()).toHaveLength(2);
  });

  test('destroyed entities should disappear from cached result sets', async () => {
    const ctx = getContext();
    const q = ctx.query.components(A);
    let ab: Entity | null = null;

    await withTick(ctx, () => {
      ctx.create(WithA);
      ab = ctx.create(WithAB);
    });
    expect(q.get()).toHaveLength(2);

    await withTick(ctx, () => ab?.destroy());
    expect(q.get()).toHaveLength(1);
  });
});

describe('indexing', () => {
  test('entities with added components should appear in new result sets', async () => {
    const ctx = getContext();
    const q = ctx.query.components(B);
    const a = ctx.create(WithA);

    await withTick(ctx, () => ctx.create(WithAB));
    expect(q.get()).toHaveLength(1);

    await withTick(ctx, () => a.components.add(B));
    expect(q.get()).toHaveLength(2);
  });

  test('entities with removed components should disappear from result sets', async () => {
    const ctx = getContext();

    const q = ctx.query.components(A);
    const ab = ctx.create(WithAB);

    await withTick(ctx, () => ctx.create(WithA));
    expect(q.get()).toHaveLength(2);

    await withTick(ctx, () => ab.components.remove(A));
    expect(q.get()).toHaveLength(1);
  });
});

describe('methods', () => {
  test('first() should return null if no results are found', () => {
    const ctx = getContext();
    expect(ctx.query.components(C).first()).toBeNull();
  });
});

describe('background registration', () => {
  test('unregistered tags should be registered at runtime', () => {
    const ctx = getContext();

    ctx.register([], [], ['A']);

    expect(ctx.manager.registrations.tags['A']).not.toBeUndefined();
    expect(ctx.manager.registrations.tags['B']).toBeUndefined();

    const q = ctx.query.all.tags('B');
    q.get();

    expect(ctx.manager.registrations.tags['B']).not.toBeUndefined();
  });
});
