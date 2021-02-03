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

describe('ofType()', () => {
  const em = new Manager();
  for (let i = 0; i < 5; i++) {
    em.create(WithA);
  }

  test('should return entities of a given type', () => {
    const results = em.query.ofType(WithA).all();
    expect(results).toHaveLength(5);
    for (const res of results) {
      expect(res).toBeInstanceOf(WithA);
    }
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
    em.create(WithAB);
    em.cleanup();

    entity1.$$.a.value = '123';
    expect(em.query.changed(A, B).first()).toBe(entity1);
  });

  test('mutation sets are cleared on cleanup()', () => {
    const em = new Manager();
    em.create(WithAB);

    const qCreate = em.query.created(A, B);
    const qChange = em.query.changed(A, B);

    expect(qChange.all()).toHaveLength(1);
    expect(qCreate.all()).toHaveLength(1);

    em.cleanup();

    expect(qChange.all()).toHaveLength(0);
    expect(qCreate.all()).toHaveLength(0);
  });
});
