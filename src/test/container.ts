import { test, describe, expect } from '@jest/globals';
import { ContainerManager as Manager } from '../managers';

import { WithABC } from './helpers/entities';
import { A, B, C } from './helpers/components';

describe('creating containers', () => {
  const em = new Manager();
  const item = em.create(WithABC);

  test('`Container.with()` adds additional items to the list of those attached to a newly-constructed container', () => {
    expect(item.items.length).toBe(3);
  });
});

describe('prepopulating components', () => {
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

describe('container tags', () => {
  const em = new Manager();
  const item = em.create(WithABC, { a: { value: '???' } }, ['awesome']);
  expect(item.tags).toContain('awesome');
});

describe('accessing components', () => {
  const em = new Manager();
  const { $, $$ } = em.create(WithABC);

  test('`$` returns all components', () => {
    const keys = Object.keys($);
    expect(keys).toContain(A.type);
    expect(keys).toContain(B.type);
    expect(keys).toContain(C.type);
  });

  test('`$$` returns all components', () => {
    const keys = Object.keys($$);
    expect(keys).toContain(A.type);
    expect(keys).toContain(B.type);
    expect(keys).toContain(C.type);
  });

  test('`$[type]` returns a component instance of that type', () => {
    expect($[A.type]).toBeInstanceOf(A);
    expect($[B.type]).toBeInstanceOf(B);
    expect($[C.type]).toBeInstanceOf(C);
  });

  test('`$$[type]` returns a component instance of that type', () => {
    expect($$[A.type]).toBeInstanceOf(A);
    expect($$[B.type]).toBeInstanceOf(B);
    expect($$[C.type]).toBeInstanceOf(C);
  });

  test('components returned with `$` are immutable', () => {
    // @ts-expect-error
    expect(() => (item.$[A.type].value = 'a')).toThrow();
  });

  test('components returned with `$$` are mutable', () => {
    expect(() => ($$[A.type].value = 'a')).not.toThrow();
    expect($$[A.type].value).toEqual('a');
  });
});
