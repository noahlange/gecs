import { describe, expect } from '@jest/globals';

import { WithA } from '../helpers/entities';
import { getContext } from '../helpers/setup';

describe('Registry', () => {
  test('remove deletes an entity', () => {
    const ctx = getContext();
    const e = ctx.create(WithA);
    ctx.tick(0);
    e.destroy();
    ctx.tick(1);

    expect(ctx.manager.index.all()).toHaveLength(0);
  });
});
