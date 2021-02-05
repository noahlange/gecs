import { test, describe, expect } from '@jest/globals';
import { ContainerManager as Manager } from '../managers';

import { A, B } from './helpers/components';
import { WithA, WithB, WithAB, cWithA } from './helpers/entities';

describe('tag queries', () => {
  const em = new Manager();
  const count = 5;

  for (let i = 0; i < count; i++) {
    em.create(WithA, {}, ['nice']);
    em.create(WithB, {}, ['nice', 'super-nice']);
    em.create(WithAB, {}, ['nice', 'super-nice', 'super-duper-nice']);
  }

  test('withTags() includes', () => {
    expect(em.query.withTag('nice').get()).toHaveLength(15);
    expect(em.query.withTag('super-duper-nice').get()).toHaveLength(5);
  });

  test('withoutTags() excludes', () => {
    expect(em.query.withoutTag('super-nice').get()).toHaveLength(5);
    expect(em.query.withoutTag('nice').get()).toHaveLength(0);
  });
});

describe('container queries', () => {
  const em = new Manager();
  const count = 5;

  for (let i = 0; i < count; i++) {
    em.create(WithA);
    em.create(WithB);
    em.create(WithAB);
  }

  test('return with() specified containeds', () => {
    const hasA = em.query.with(A).get();
    const hasB = em.query.with(B).get();
    expect(hasA).toHaveLength(count * 2);
    expect(hasB).toHaveLength(count * 2);
  });

  test('return without() specified containers', () => {
    expect(em.query.without(A).get()).toHaveLength(count);
    expect(em.query.without(A, B).get()).toHaveLength(0);
  });

  test('return with()/without() specified containers', () => {
    expect(em.query.with(A).without(B).get()).toHaveLength(count);
  });
});

describe('ofType()', () => {
  const em = new Manager();
  for (let i = 0; i < 5; i++) {
    em.create(WithA);
    em.create(cWithA);
  }

  test('should return entities of a given type', () => {
    const results = em.query.ofType(WithA).get();
    expect(results).toHaveLength(5);
    for (const res of results) {
      expect(res).toBeInstanceOf(WithA);
    }
  });

  test('...including composed constructors', () => {
    const results = em.query.ofType(cWithA).get();
    expect(results).toHaveLength(5);
    for (const res of results) {
      expect(res).toBeInstanceOf(cWithA);
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

describe('mutations', () => {
  test('created() should return newly-created entities', () => {
    const em = new Manager();
    const entity1 = em.create(WithAB);
    const res = em.query.created(A, B).first();
    expect(res).toEqual(entity1);
  });

  test('changed() should return modified entities', () => {
    const em = new Manager();
    const a = em.create(WithA);

    em.cleanup();

    a.$$.a.value = '123';

    expect(em.query.changed(A, B).first()).toBeNull();
    expect(em.query.changed(A).first()).toBe(a);
  });

  test('mutation sets are cleared on cleanup()', () => {
    const em = new Manager();
    em.create(WithAB);

    const qCreate = em.query.created(A, B);
    const qChange = em.query.changed(A, B);

    expect(qChange.get()).toHaveLength(1);
    expect(qCreate.get()).toHaveLength(1);

    em.cleanup();

    expect(qChange.get()).toHaveLength(0);
    expect(qCreate.get()).toHaveLength(0);
  });
});
