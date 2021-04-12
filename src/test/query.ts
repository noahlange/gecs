import { describe, test, expect } from '@jest/globals';
import { EntityManager } from '../managers/EntityManager';
import { setup } from './helpers/setup';
import { A, B, C } from './helpers/components';
import { WithA, WithAB } from './helpers/entities';
import { withTick } from './helpers/utils';
import type { Entity } from '../ecs';

describe('basic query types', () => {
  const count = 5;

  test('select by component', () => {
    const { em } = setup();
    const hasA = em.query.all.components(A);

    expect(hasA.get()).toHaveLength(count * 3);
  });

  test('select by tag', () => {
    const { em } = setup();
    const withABTags = em.query.any.tags('a', 'b');
    expect(withABTags.get()).toHaveLength(count * 4);
  });

  test('select by entity', () => {
    const { em } = setup();
    for (const item of em.query.any.entities(WithA)) {
      expect(item).toBeInstanceOf(WithA);
    }
  });
});

describe('implicit queries', () => {
  const count = 5;

  test('select by component', () => {
    const { em } = setup();
    const hasA = em.query.components(A).get();
    expect(hasA).toHaveLength(count * 3);
  });

  test('select by tag', () => {
    const { em } = setup();
    const withABTags = em.query.tags('a', 'b').get();
    expect(withABTags).toHaveLength(count * 1);
  });

  test('select by entity', () => {
    const { em } = setup();
    for (const item of em.query.entities(WithA)) {
      expect(item).toBeInstanceOf(WithA);
    }
  });
});

describe('basic query modifiers', () => {
  const count = 5;
  test('return .all components', () => {
    const { em } = setup();

    const hasA = em.query.components(A);
    expect(hasA.get()).toHaveLength(count * 3);

    const hasAB = em.query.components(A, B);
    expect(hasAB.get()).toHaveLength(count * 1);
  });

  test('return .any components', () => {
    const { em } = setup();

    const hasABC = em.query.any.components(A, B, C);
    expect(hasABC.get()).toHaveLength(count * 4);

    const hasC = em.query.any.components(C);
    expect(hasC.get()).toHaveLength(count * 2);
  });

  test('return .none components', () => {
    const { em } = setup();
    const noA = em.query.none.components(A);
    expect(noA.get()).toHaveLength(count); // i.e., WithB
  });
});

describe('tag queries', () => {
  const count = 5;

  test('.all.tags()', () => {
    const { em } = setup();
    expect(em.query.tags('a').get()).toHaveLength(count * 3);
    expect(em.query.tags('c').get()).toHaveLength(count * 2);
  });

  test('.none.tags()', () => {
    const { em } = setup();
    expect(em.query.none.tags('a').get()).toHaveLength(count);
    expect(em.query.none.tags('a', 'b').get()).toHaveLength(0);
  });

  test('newly-added tags', () => {
    const em = new EntityManager();
    const q = em.query.all.components(A).tags('a').persist();
    const entities: Entity[] = [];

    withTick(em, () => {
      for (let i = 0; i < count; i++) {
        entities.push(em.create(WithA, {}, []));
      }
    });

    expect(q.get()).toHaveLength(0);

    withTick(em, () => {
      for (const entity of entities) {
        entity.tags.add('a');
      }
    });

    expect(Array.from(q)).toHaveLength(count);
  });

  test('newly-removed tags', () => {
    const em = new EntityManager();
    const q = em.query.components(A).tags('a').persist();
    const entities: Entity[] = [];

    withTick(em, () => {
      for (let i = 0; i < count; i++) {
        entities.push(em.create(WithA, {}, ['a']));
      }
    });

    expect(q.get()).toHaveLength(count);

    withTick(em, () => {
      for (const entity of entities) {
        entity.tags.remove('a');
      }
    });

    expect(q.get()).toHaveLength(0);
  });
});

describe('complex queries', () => {
  const count = 5;
  test('components + tags', () => {
    const { em } = setup();
    const q = em.query.components(A).some.components(B).none.tags('c');
    expect(q.get()).toHaveLength(count);
  });
});

describe('entity queries', () => {
  const count = 5;

  test('return with specified components', () => {
    const { em } = setup();
    const hasA = em.query.components(A);
    const hasB = em.query.components(B);
    expect(hasA.get()).toHaveLength(count * 3);
    expect(hasB.get()).toHaveLength(count * 2);
  });

  test('return without specified components', () => {
    const { em } = setup();
    const noA = em.query.none.components(A);
    const noB = em.query.none.components(A, B);
    expect(noA.get()).toHaveLength(count);
    expect(noB.get()).toHaveLength(0);
  });

  test('chained queries', () => {
    const { em } = setup();
    const q = em.query.components(A).none.components(B);
    expect(q.get()).toHaveLength(count * 2);
  });
});

describe('first()', () => {
  test('first() should return a single entity', () => {
    const em = new EntityManager();
    let a: WithA | null = null;
    withTick(em, () => {
      a = em.create(WithA, {}, ['a']);
    });

    expect(em.query.components(A).first()).toBe(a);
  });
});

describe('caching', () => {
  test("make sure a restricted result set doesn't inadvertently filter larger result sets", () => {
    const em = new EntityManager();

    withTick(em, () => {
      em.create(WithA, {}, ['a', 'b', 'c']);
      em.create(WithAB, {});
    });

    const a = em.query.tags('a').all.components(A);
    const b = em.query.components(A);

    expect(a.get()).toHaveLength(1);
    expect(b.get()).toHaveLength(2);
  });

  test('should add new items to cached result sets', () => {
    const em = new EntityManager();
    const q = em.query.components(A).persist();

    withTick(em, () => em.create(WithA));
    expect(q.get()).toHaveLength(1);

    withTick(em, () => em.create(WithAB));
    expect(q.get()).toHaveLength(2);
  });

  test('removed items should disappear from cached result sets', () => {
    const em = new EntityManager();
    const q = em.query.all.components(A).persist();
    let ab: Entity | null = null;

    withTick(em, () => {
      em.create(WithA);
      ab = em.create(WithAB);
    });
    expect(q.get()).toHaveLength(2);

    withTick(em, () => ab?.destroy());
    expect(q.get()).toHaveLength(1);
  });
});

describe('indexing', () => {
  test('entities with added components should appear in new result sets', () => {
    const em = new EntityManager();
    const q = em.query.all.components(B).persist();
    const a = em.create(WithA);

    withTick(em, () => em.create(WithAB));
    expect(q.get()).toHaveLength(1);

    withTick(em, () => a.components.add(B));
    expect(q.get()).toHaveLength(2);
  });

  test('entities with removed components should disappear from result sets', () => {
    const em = new EntityManager();
    const q = em.query.components(A).persist();
    const ab = em.create(WithAB);

    withTick(em, () => em.create(WithA));
    expect(q.get()).toHaveLength(2);

    withTick(em, () => ab.components.remove(A));
    expect(q.get()).toHaveLength(1);
  });
});
