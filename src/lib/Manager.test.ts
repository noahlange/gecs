import { describe, expect, test } from 'vitest';

import { getContext } from '../test/helpers';
import { A, B } from '../test/helpers/components';
import { WithAB } from '../test/helpers/entities';

describe('queries', () => {
  test('identical queries should be cached', () => {
    const ctx = getContext();
    const a = ctx.query.components(A).tags('A', 'B', 'C').query;
    const b = ctx.query.components(A).tags('A', 'B', 'C').query;

    expect(a).toBe(b);
  });
});

describe('entity class key caching', () => {
  test('entities with modified components should "lose" their cached base key', () => {
    const ctx = getContext();
    const e1 = ctx.create(WithAB);
    const e2 = ctx.create(WithAB);

    ctx.tick();

    e1.components.remove(B), ctx.tick();

    // @ts-expect-error: accessibility abuse
    expect(ctx.manager.getEntityKey(e1)).not.toBe(ctx.manager.getEntityKey(e2));
  });
});
