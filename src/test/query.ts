import { describe, test, expect } from '@jest/globals';
import { EntityManager } from '../managers/EntityManager';
import { setup } from './helpers/setup';
import { A, B, C } from './helpers/components';
import { WithA, WithAB } from './helpers/entities';

describe('basic query types', () => {
  const count = 5;

  test('select by component', () => {
    const { em } = setup();
    const hasA = em.query.all.components(A).get();
    expect(hasA).toHaveLength(count * 3);
  });

  test('select by tag', () => {
    const { em } = setup();
    const withABTags = em.query.tags('a', 'b').get();
    expect(withABTags).toHaveLength(count * 1);
  });

  test('select by entity', () => {
    const { em } = setup();
    const withAs = em.query.any.entities(WithA).get();
    for (const item of withAs) {
      expect(item).toBeInstanceOf(WithA);
    }
  });
});

describe('basic query modifiers', () => {
  const count = 5;
  test('return .all components', () => {
    const { em } = setup();
    const hasA = em.query.components(A).get();
    const hasAB = em.query.components(A, B).get();

    expect(hasA).toHaveLength(count * 3);
    expect(hasAB).toHaveLength(count * 1);
  });

  test('return .any components', () => {
    const { em } = setup();
    const hasABC = em.query.any.components(A, B, C).get();
    const hasC = em.query.any.components(C).get();

    expect(hasABC).toHaveLength(count * 4);
    expect(hasC).toHaveLength(count * 2);
  });

  test('return .none components', () => {
    const { em } = setup();
    const noA = em.query.none.components(A).get();
    expect(noA).toHaveLength(count); // i.e., WithB
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
});

describe('entity queries', () => {
  const count = 5;

  test('return with specified components', () => {
    const { em } = setup();
    const hasA = em.query.components(A).get();
    const hasB = em.query.components(B).get();
    expect(hasA).toHaveLength(count * 3);
    expect(hasB).toHaveLength(count * 2);
  });

  test('return without specified components', () => {
    const { em } = setup();
    expect(em.query.none.components(A).get()).toHaveLength(count);
    expect(em.query.none.components(A, B).get()).toHaveLength(0);
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
    const a = em.create(WithA, {}, ['a']);
    expect(em.query.components(A).first()).toBe(a);
  });
});

describe('caching', () => {
  test("make sure a restricted result set doesn't inadvertently filter larger result sets", () => {
    const em = new EntityManager();

    em.create(WithA, {}, ['a', 'b', 'c']);
    em.create(WithAB, {});

    // smaller result set
    const a = em.query.all.tags('a').all.components(A).get();

    // larger result set
    const b = em.query.all.components(A).get();

    expect(b.length).toBeGreaterThan(a.length);
  });

  test('should add new items to cached result sets', () => {
    const em = new EntityManager();
    em.create(WithA);
    const q1 = em.query.all.components(A).get();

    em.create(WithAB);
    em.cleanup();

    const q2 = em.query.all.components(A).get();

    expect(q1).toHaveLength(1);
    expect(q2).toHaveLength(2);
  });

  test('removed items should disappear from cached result sets', () => {
    const em = new EntityManager();
    const [, ab] = [em.create(WithA), em.create(WithAB)];
    const q1 = em.query.all.components(A).get();

    ab.destroy();
    em.cleanup();

    const q2 = em.query.all.components(A).get();

    expect(q1).toHaveLength(2);
    expect(q2).toHaveLength(1);
  });
});
