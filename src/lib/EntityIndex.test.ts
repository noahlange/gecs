import { describe, expect, test } from 'vitest';

import { getContext } from '../test/helpers';
import { WithA } from '../test/helpers/entities';

describe('Registry', () => {
  test('remove deletes an entity', () => {
    const ctx = getContext();
    const e = ctx.create(WithA);
    ctx.tick(0);
    e.destroy();
    ctx.tick(1);

    expect(ctx.manager.index.all()).toHaveLength(0);
  });

  test("attempting to query on non-existent keys won't throw", () => {
    const ctx = getContext();

    const ids = [...ctx.manager.index.keys(), -2n];

    expect(() => ctx.manager.index.get(ids)).not.toThrow();
  });
});
