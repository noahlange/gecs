import { test, describe, expect } from '@jest/globals';
import { EntityManager as Manager } from '../managers';

import { aWithA, WithABC } from './helpers/entities';
import { A, B, C } from './helpers/components';
import { Entity } from '../ecs';

describe('creating entities', () => {
  const em = new Manager();
  const item = em.create(WithABC);

  test('`Entity.with()` adds additional items to the list of those attached to a newly-constructed container', () => {
    expect(item.items.length).toBe(3);
  });

  test('Entity.with() supports array components', () => {
    const MyEntity = Entity.with(A, [B], C);
    const e = em.create(MyEntity);
    expect(e.$.b).toBeInstanceOf(Array);
    expect(e.$.b.every(item => item instanceof B)).toBeTruthy();
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

  test('populating array components', () => {
    const em = new Manager();
    const item = em.create(aWithA, {
      a: [{ value: '???' }]
    });
    expect(item.$.a[0].value).toEqual('???');
  });
});

describe('runtime modification', () => {
  test('adding array components', () => {
    const em = new Manager();
    const item = em.create(aWithA, {
      a: [{ value: '???' }]
    });

    item.components.add(A, { value: '123' });

    expect(item.$.a[0].value).toBe('???');
    expect(item.$.a[1].value).toBe('123');
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
