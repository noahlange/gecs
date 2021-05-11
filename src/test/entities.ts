import { describe, expect, test } from '@jest/globals';

import { Manager as Manager } from '../lib';
import { A, B, C } from './helpers/components';
import { WithAB, WithABC } from './helpers/entities';

describe('creating entities', () => {
  const em = new Manager();
  const item = em.create(WithABC);

  test('`Entity.with()` adds additional items to the list of those attached to a newly-constructed container', () => {
    expect(item.items.length).toBe(3);
  });
});

describe('populating components', () => {
  test('populating simple components', () => {
    const em = new Manager();
    const item = em.create(WithABC, {
      a: { value: '???' },
      b: { value: 123 },
      c: { value: false }
    });
    expect(item.$.a.value).toEqual('???');
    expect(item.$.b.value).toEqual(123);
    expect(item.$.c.value).toEqual(false);
  });
});

describe('component bindings', () => {
  const em = new Manager();
  const { $ } = em.create(WithABC);

  test('`$` returns all components', () => {
    const keys = Object.keys($);
    expect(keys).toContain(A.type);
    expect(keys).toContain(B.type);
    expect(keys).toContain(C.type);
  });

  test('`$` returns all components', () => {
    const keys = Object.keys($);
    expect(keys).toContain(A.type);
    expect(keys).toContain(B.type);
    expect(keys).toContain(C.type);
  });

  test('`$[type]` returns a component instance of that type', () => {
    expect($[A.type]).toBeInstanceOf(A);
    expect($[B.type]).toBeInstanceOf(B);
    expect($[C.type]).toBeInstanceOf(C);
  });
});

describe('component helpers', () => {
  const em = new Manager();
  const entity = em.create(WithAB, {}, ['MY_TAG']);
  test('has() returns true if all components are present', () => {
    expect(entity.has(A, B)).toBeTruthy();
    expect(entity.has(A, C)).toBeFalsy();
  });

  test('is() returns true if all tags are present', () => {
    expect(entity.is('MY_TAG')).toBeTruthy();
    expect(entity.is('OTHER_TAG')).toBeFalsy();
  });
});
