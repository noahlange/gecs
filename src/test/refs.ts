import { describe, expect, test } from '@jest/globals';

import { Entity, EntityRef } from '../ecs';
import { WithABC } from './helpers/entities';
import { getContext } from './helpers/setup';
import { withTick } from './helpers/utils';

class RefABC extends EntityRef<WithABC> {
  public static readonly type = 'abc';
}

describe('entity references', () => {
  const WithRefABC = Entity.with(RefABC);

  test('...can be set on entity creation', () => {
    const ctx = getContext();
    const abc = ctx.create(WithABC);
    const withRef = ctx.create(WithRefABC, { abc });
    expect(withRef.$.abc).toBe(abc);
  });

  test('...can be set at runtime', () => {
    const ctx = getContext();
    const abc = ctx.create(WithABC);
    const withRef = ctx.create(WithRefABC, {});
    withRef.$.abc = abc;
    expect(withRef.$.abc).toBe(abc);
  });

  test('...to destroyed entities should be nullified', () => {
    const ctx = getContext();
    const abc = ctx.create(WithABC);
    const withRef = ctx.create(WithRefABC, { abc });
    abc.destroy();
    expect(withRef.$.abc).toBeNull();
  });
});

describe('entity reference queries', () => {
  const WithRefABC = Entity.with(RefABC);

  test('...can query referenced entities', async () => {
    const ctx = getContext();
    const [abc, withRef] = await withTick(ctx, () => [
      ctx.create(WithABC),
      ctx.create(WithRefABC, {})
    ]);

    const q = ctx.query.references(abc);

    expect(q.first()).toBeNull();
    await withTick(ctx, () => {
      withRef.$.abc = abc;
    });

    expect(q.first()).toBe(withRef);

    await withTick(ctx, () => {
      withRef.$.abc = null;
    });

    expect(q.first()).toBe(null);
  });
});
