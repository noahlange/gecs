import type { Entity } from '../ecs';

import { describe, expect, test } from '@jest/globals';

import { Manager } from '../lib/Manager';
import { A, B, C } from './helpers/components';
import { WithA, WithAB } from './helpers/entities';
import { setup } from './helpers/setup';
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
    const em = new Manager();
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
    const em = new Manager();
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
    const em = new Manager();
    let a: WithA | null = null;
    await withTick(em, () => {
      a = em.create(WithA, {}, ['a']);
    });

    expect(em.$.components(A).first()).toBe(a);
  });
});

describe('caching', () => {
  test("make sure a restricted result set doesn't inadvertently filter larger result sets", async () => {
    const em = new Manager();

    await withTick(em, () => {
      em.create(WithA, {}, ['a', 'b', 'c']);
      em.create(WithAB, {});
    });

    const a = em.$.tags('a').components(A);
    const b = em.$.components(A);

    expect(a.get()).toHaveLength(1);
    expect(b.get()).toHaveLength(2);
  });

  test('created entities should be added to cached result sets', async () => {
    const em = new Manager();
    const q = em.$.components(A);

    await withTick(em, () => em.create(WithA));
    expect(q.get()).toHaveLength(1);

    await withTick(em, () => em.create(WithAB));
    expect(q.get()).toHaveLength(2);
  });

  test('destroyed entities should disappear from cached result sets', async () => {
    const em = new Manager();
    const q = em.$.components(A);
    let ab: Entity | null = null;

    await withTick(em, () => {
      em.create(WithA);
      ab = em.create(WithAB);
    });
    expect(q.get()).toHaveLength(2);

    await withTick(em, () => ab?.destroy());
    expect(q.get()).toHaveLength(1);
  });
});

describe('indexing', () => {
  test('entities with added components should appear in new result sets', async () => {
    const em = new Manager();
    const q = em.$.components(B);
    const a = em.create(WithA);

    await withTick(em, () => em.create(WithAB));
    expect(q.get()).toHaveLength(1);

    await withTick(em, () => a.components.add(B));
    expect(q.get()).toHaveLength(2);
  });

  test('entities with removed components should disappear from result sets', async () => {
    const em = new Manager();
    const q = em.$.components(A);
    const ab = em.create(WithAB);

    await withTick(em, () => em.create(WithA));
    expect(q.get()).toHaveLength(2);

    await withTick(em, () => ab.components.remove(A));
    expect(q.get()).toHaveLength(1);
  });
});
