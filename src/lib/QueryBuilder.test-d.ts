import type { Entity } from '../ecs';

import { describe, expectTypeOf, test } from 'vitest';

import { setup } from '../test/helpers';
import { A, B } from '../test/helpers/components';

describe('query modifiers', () => {
  test('.none() properly omits components', async () => {
    const { ctx } = await setup();

    const noB = ctx.query.all.components(A).none.components(B).first()!;

    expectTypeOf(noB).toMatchTypeOf<Entity<{ a: A }>>();
  });
});
