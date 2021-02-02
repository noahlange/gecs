import { test, describe, expect, jest } from '@jest/globals';
import { Contained } from '../lib';
import { ContainerManager as Manager } from '../managers';

import { A, B } from './helpers/components';
import { WithA, WithB, WithAB } from './helpers/entities';

describe('container queries', () => {
  const em = new Manager();
  const count = 5;

  for (let i = 0; i < count; i++) {
    em.create(WithA);
    em.create(WithB);
    em.create(WithAB);
  }

  test('return with() specified containeds', () => {
    const hasA = em.query.with(A).all();
    const hasB = em.query.with(B).all();
    expect(hasA).toHaveLength(count * 2);
    expect(hasB).toHaveLength(count * 2);
  });

  test('return without() specified containers', () => {
    expect(em.query.without(A).all()).toHaveLength(count);
    expect(em.query.without(A, B).all()).toHaveLength(0);
  });

  test('return with()/without() specified containers', () => {
    expect(em.query.with(A).without(B).all()).toHaveLength(count);
  });
});

describe('first()', () => {
  const em = new Manager();
  const a = em.create(WithA);

  em.create(WithB);
  em.create(WithAB);

  test('first() should return a single entity', () => {
    expect(em.query.with(A).first()).toBe(a);
  });
});

describe('find()/findIn()', () => {
  const em = new Manager();
  const a = em.create(WithA);
  const b = em.create(WithB);
  const ab = em.create(WithAB);

  test('find() should return a single entity by id', () => {
    expect(em.query.with(A).find(a.id)).toBe(a);
  });

  test('find() should return null if no match is found', () => {
    expect(em.query.with(A).find(b.id)).toBeNull();
  });

  test('findIn() should return an array of entries', () => {
    const res = em.query.with(B).findIn([a.id, ab.id]);
    expect(res).toHaveLength(1);
    expect(res.includes(ab)).toBeTruthy();
  });
});

describe('warnings', () => {
  const em = new Manager();

  test('should warn about unnamed components', () => {
    const spy = jest
      .spyOn(globalThis.console, 'warn')
      .mockImplementation(() => {});

    em.query.with(Contained);
    expect(console.warn).toHaveBeenCalled();

    spy.mockRestore();
  });
});

describe('mutations', () => {
  test('created() should return newly-created entities', () => {
    const em = new Manager();
    const entity1 = em.create(WithAB);
    const res = em.query.created(A, B).first();
    expect(res).toEqual(entity1);
  });

  test('changed() should return modified entities', () => {
    const em = new Manager();
    const entity1 = em.create(WithAB);
    const entity2 = em.create(WithAB);

    em.query.changed(A, B).all(); // 2
    em.query.changed(A, B).all(); // 0

    entity1.$$.a.value = '123';
    expect(em.query.changed(A, B).first()).toBe(entity1);
  });

  test('a changed() component is declared unchanged/uncreated after being queried and returned', () => {
    const em = new Manager();
    em.create(WithAB);
    const a = em.query.changed(A, B).all(); // [ab]
    const b = em.query.changed(A, B).all(); // []

    expect(a).toHaveLength(1);
    expect(b).toHaveLength(0);
  });
});
