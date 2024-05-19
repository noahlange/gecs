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

  test('sequential component calls work properly', async () => {
    const { ctx } = await setup();
    const maybeB = ctx.query.all.components(A).some.components(B).first()!;
    expectTypeOf(maybeB).toMatchTypeOf<Entity<{ a: A; b?: B }>>();
  });

  test('multi-parameter component calls work properly', async () => {
    const { ctx } = await setup();
    const maybeB = ctx.query.all.components(A, B).first()!;
    expectTypeOf(maybeB).toMatchTypeOf<Entity<{ a: A; b: B }>>();
  });

  test('un-narrowed queries default to all()', async () => {
    const { ctx } = await setup();
    const maybeB = ctx.query.components(A, B).first()!;
    expectTypeOf(maybeB).toMatchTypeOf<Entity<{ a: A; b: B }>>();
  });
});
