import { test, describe, expect } from '@jest/globals';
import { WithA, WithAB } from './helpers/entities';
import { A, B, C } from './helpers/components';
import { setup } from './helpers/setup';
import { Manager } from '..';

describe('basic query types', () => {
  const count = 5;

  test('select by component', () => {
    const { em } = setup();
    const hasA = em.query.all.components(A).get();
    expect(hasA).toHaveLength(count * 3);
  });

  test('select by id', () => {
    const { em, ids } = setup();
    const hasIDs = em.query.any.ids(...ids.slice(0, 5)).get();
    expect(hasIDs).toHaveLength(5);
  });

  test('select by entity', () => {
    const { em } = setup();
    const withAs = em.query.any.entities(WithA).get();
    expect(withAs).toHaveLength(count);
  });

  test('select by tag', () => {
    const { em } = setup();
    const withABTags = em.query.all.tags('a', 'b').get();
    expect(withABTags).toHaveLength(count * 2);
  });
});

describe('basic query modifiers', () => {
  const count = 5;
  test('return .all components', () => {
    const { em } = setup();
    const hasA = em.query.all.components(A).get();
    const hasAB = em.query.all.components(A, B).get();

    expect(hasA).toHaveLength(count * 3);
    expect(hasAB).toHaveLength(count * 2);
  });

  test('return .any components', () => {
    const { em } = setup();
    const hasABC = em.query.any.components(A, B, C).get();
    const hasC = em.query.any.components(C).get();

    expect(hasABC).toHaveLength(count * 4);
    expect(hasC).toHaveLength(count);
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
    expect(em.query.all.tags('a').get()).toHaveLength(count * 3);
    expect(em.query.all.tags('c').get()).toHaveLength(count);
  });

  test('.none.tags()', () => {
    const { em } = setup();
    expect(em.query.none.tags('b').get()).toHaveLength(count);
    expect(em.query.none.tags('a').get()).toHaveLength(count);
    expect(em.query.none.tags('a', 'b').get()).toHaveLength(0);
  });
});

describe('container queries', () => {
  const count = 5;

  test('return with() specified containeds', () => {
    const { em } = setup();
    const hasA = em.query.components(A).get();
    const hasB = em.query.components(B).get();
    expect(hasA).toHaveLength(count * 3);
    expect(hasB).toHaveLength(count * 3);
  });

  test('return without() specified containers', () => {
    const { em } = setup();
    expect(em.query.none.components(A).get()).toHaveLength(count);
    expect(em.query.none.components(A, B).get()).toHaveLength(0);
  });

  test('return with()/without() specified containers', () => {
    const { em } = setup();
    expect(em.query.components(A).none.components(B).get()).toHaveLength(count);
  });
});

describe('first()', () => {
  test('first() should return a single entity', () => {
    const em = new Manager();
    const a = em.create(WithA, {}, ['a']);
    expect(em.query.components(A).first()).toBe(a);
  });
});

describe('mutations', () => {
  test('.created should return newly-created entities', () => {
    const em = new Manager();
    const entity1 = em.create(WithAB);
    const res = em.query.any.created.components(A, B).first();
    expect(res).toEqual(entity1);
  });

  test('.changed should return modified entities', () => {
    const em = new Manager();
    const a = em.create(WithA);

    em.cleanup();

    a.$$.a.value = '123';

    expect(em.query.changed.all.components(A, B).first()).toBeNull();
    expect(em.query.changed.all.components(A).first()).toBe(a);
  });

  test('.changed should also return newly-created entries', () => {
    const em = new Manager();
    const entity1 = em.create(WithAB);
    const res = em.query.any.changed.components(A, B).first();
    expect(res).toEqual(entity1);
  });

  test('clear mutation sets on cleanup', () => {
    const em = new Manager();
    em.create(WithAB);

    const qCreate = em.query.any.created.components(A, B);
    const qChange = em.query.any.changed.components(A, B);

    expect(qChange.get()).toHaveLength(1);
    expect(qCreate.get()).toHaveLength(1);

    em.cleanup();

    expect(qChange.get()).toHaveLength(0);
    expect(qCreate.get()).toHaveLength(0);
  });
});
