import { test, describe, expect } from '@jest/globals';
import { ContainerManager as Manager } from '../managers';

import { WithA, WithAB, WithABC, WithB } from './helpers/entities';
import { A, B, C } from './helpers/components';

describe('basic query types', () => {
  const em = new Manager();
  const ids: string[] = [];
  const count = 5;

  for (let i = 0; i < count; i++) {
    const a = em.create(WithA, {}, ['a']);
    const b = em.create(WithB, {}, ['b']);
    const c = em.create(WithAB, {}, ['a', 'b']);
    const d = em.create(WithABC, {}, ['a', 'b', 'c']);
    ids.push(a.id, b.id, c.id, d.id);
  }

  test('select by component', () => {
    const hasA = em.query.all.components(A).get();
    expect(hasA).toHaveLength(count * 3);
  });

  test('select by id', () => {
    const hasIDs = em.query.any.ids(...ids.slice(0, 5)).get();
    expect(hasIDs).toHaveLength(5);
  });

  test('select by entity', () => {
    const withAs = em.query.any.entities(WithA).get();
    expect(withAs).toHaveLength(count);
  });

  test('select by tag', () => {
    const withABTags = em.query.all.tags('a', 'b').get();
    expect(withABTags).toHaveLength(count * 2);
  });
});

describe('basic query modifiers', () => {
  const em = new Manager();
  const count = 5;

  for (let i = 0; i < count; i++) {
    em.create(WithA);
    em.create(WithB);
    em.create(WithAB);
    em.create(WithABC);
  }

  test('return .all components', () => {
    const hasA = em.query.all.components(A).get();
    const hasAB = em.query.all.components(A, B).get();

    expect(hasA).toHaveLength(count * 3);
    expect(hasAB).toHaveLength(count * 2);
  });

  test('return .any components', () => {
    const hasABC = em.query.any.components(A, B, C).get();
    const hasC = em.query.any.components(C).get();

    expect(hasABC).toHaveLength(count * 3);
    expect(hasC).toHaveLength(count);
  });

  test('return .none components', () => {
    const noA = em.query.none.components(A).get();
    expect(noA).toHaveLength(count); // i.e., WithB
  });
});
