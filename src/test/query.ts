import type { Entity } from '../ecs';

import { describe, expect, test } from '@jest/globals';

import { A, B, C } from './helpers/components';
import { WithA, WithAB } from './helpers/entities';
import { getContext, setup } from './helpers/setup';
import { withTick } from './helpers/utils';

describe('basic types', () => {
  const count = 5;

  test('select by component', async () => {
    const { em } = await setup();
    const hasA = em.$.components.all(A);
    expect(hasA.get()).toHaveLength(count * 3);
  });

  test('select by tag', async () => {
    const { em } = await setup();
    const withABTags = em.$.tags.any('a', 'b');
    expect(withABTags.get()).toHaveLength(count * 4);
  });
});

describe('implicit queries', () => {
  const count = 5;

  test('select by component', async () => {
    const { em } = await setup();
    const hasA = em.$.components(A).get();
    expect(hasA).toHaveLength(count * 3);
  });

  test('select by tag', async () => {
    const { em } = await setup();
    const withABTags = em.$.tags('a', 'b').get();
    expect(withABTags).toHaveLength(count * 1);
  });
});

describe('basic query modifiers', () => {
  const count = 5;
  test('.components.all()', async () => {
    const { em } = await setup();

    const hasA = em.$.components(A);
    expect(hasA.get()).toHaveLength(count * 3);

    const hasAB = em.$.components(A, B);
    expect(hasAB.get()).toHaveLength(count * 1);
  });

  test('.components.any()', async () => {
    const { em } = await setup();

    const hasABC = em.$.components.any(A, B, C);
    expect(hasABC.get()).toHaveLength(count * 4);

    const hasC = em.$.components.any(C);
    expect(hasC.get()).toHaveLength(count * 2);
  });

  test('.components.none()', async () => {
    const { em } = await setup();
    const noA = em.$.components.none(A);
    expect(noA.get()).toHaveLength(count); // i.e., WithB
  });
});

describe('tag queries', () => {
  const count = 5;

  test('.tags.all()', async () => {
    const { em } = await setup();
    expect(em.$.tags.all('a').get()).toHaveLength(count * 3);
    expect(em.$.tags.all('c').get()).toHaveLength(count * 2);
  });

  test('.tags.none()', async () => {
    const { em } = await setup();
    expect(em.$.tags.none('a').get()).toHaveLength(count);
    expect(em.$.tags.none('a', 'b').get()).toHaveLength(0);
  });

  test('newly-added tags', async () => {
    const ctx = getContext();
    const em = ctx.manager;
    const q = em.$.components(A).tags('a');
    const entities: Entity[] = [];

    await withTick(em, () => {
      for (let i = 0; i < count; i++) {
        entities.push(em.create(WithA, {}, []));
      }
    });

    expect(q.get()).toHaveLength(0);

    await withTick(em, () => {
      for (const entity of entities) {
        entity.tags.add('a');
      }
    });

    expect(Array.from(q)).toHaveLength(count);
  });

  test('newly-removed tags', async () => {
    const ctx = getContext();
    const em = ctx.manager;
    const q = em.$.components(A).tags('a');
    const entities: Entity[] = [];

    await withTick(em, () => {
      for (let i = 0; i < count; i++) {
        entities.push(em.create(WithA, {}, ['a']));
      }
    });

    expect(q.get()).toHaveLength(count);

    await withTick(em, () => {
      for (const entity of entities) {
        entity.tags.remove('a');
      }
    });

    expect(q.get()).toHaveLength(0);
  });
});

describe('complex queries', () => {
  const count = 5;
  test('components + tags', async () => {
    const { em } = await setup();
    const q = em.$.components.all(A).components.some(B).tags.none('c');
    expect(q.get()).toHaveLength(count);
  });
});

describe('entity queries', () => {
  const count = 5;

  test('return with specified components', async () => {
    const { em } = await setup();
    const hasA = em.$.components(A);
    const hasB = em.$.components(B);
    expect(hasA.get()).toHaveLength(count * 3);
    expect(hasB.get()).toHaveLength(count * 2);
  });

  test('return without specified components', async () => {
    const { em } = await setup();
    const noA = em.$.components.none(A);
    const noB = em.$.components.none(A, B);
    expect(noA.get()).toHaveLength(count);
    expect(noB.get()).toHaveLength(0);
  });

  test('chained queries', async () => {
    const { em } = await setup();
    const q = em.$.components(A).components.none(B);
    expect(q.get()).toHaveLength(count * 2);
  });
});

describe('first()', () => {
  test('first() should return a single entity', async () => {
    const ctx = getContext();
    let a: WithA | null = null;
    await withTick(ctx, () => {
      a = ctx.create(WithA, {}, ['a']);
    });

    expect(ctx.$.components(A).first()).toBe(a);
  });
});

describe('caching', () => {
  test("make sure a restricted result set doesn't inadvertently filter larger result sets", async () => {
    const ctx = getContext();

    await withTick(ctx, () => {
      ctx.create(WithA, {}, ['a', 'b', 'c']);
      ctx.create(WithAB, {});
    });

    const a = ctx.$.tags('a').components(A);
    const b = ctx.$.components(A);

    expect(a.get()).toHaveLength(1);
    expect(b.get()).toHaveLength(2);
  });

  test('created entities should be added to cached result sets', async () => {
    const ctx = getContext();
    const q = ctx.$.components(A);

    await withTick(ctx, () => ctx.create(WithA));
    expect(q.get()).toHaveLength(1);

    await withTick(ctx, () => ctx.create(WithAB));
    expect(q.get()).toHaveLength(2);
  });

  test('destroyed entities should disappear from cached result sets', async () => {
    const ctx = getContext();
    const q = ctx.$.components(A);
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
    const q = ctx.$.components(B);
    const a = ctx.create(WithA);

    await withTick(ctx, () => ctx.create(WithAB));
    expect(q.get()).toHaveLength(1);

    await withTick(ctx, () => a.components.add(B));
    expect(q.get()).toHaveLength(2);
  });

  test('entities with removed components should disappear from result sets', async () => {
    const ctx = getContext();

    const q = ctx.$.components(A);
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
    expect(ctx.$.components(C).first()).toBeNull();
  });
});
