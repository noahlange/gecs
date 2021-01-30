import { test, describe, expect } from '@jest/globals';
import { Manager } from '../lib';

import { WithABC } from './helpers/containers';
import { A, B, C } from './helpers/containeds';

describe('creating containers', () => {
  const em = new Manager();
  const item = new WithABC(em);

  test('`Container.with()` adds additional items to the list of those attached to a newly-constructed container', () => {
    expect(item.items.length).toBe(3);
  });
});

describe('accessing components', () => {
  const em = new Manager();
  const item = new WithABC(em);

  test('`$` returns all components', () => {
    const keys = Object.keys(item.$);
    expect(keys).toContain(A.type);
    expect(keys).toContain(B.type);
    expect(keys).toContain(C.type);
  });

  test('`$$` returns all components', () => {
    const keys = Object.keys(item.$$);
    expect(keys).toContain(A.type);
    expect(keys).toContain(B.type);
    expect(keys).toContain(C.type);
  });

  test('`$[type]` returns a component instance of that type', () => {
    expect(item.$[A.type]).toBeInstanceOf(A);
    expect(item.$[B.type]).toBeInstanceOf(B);
    expect(item.$[C.type]).toBeInstanceOf(C);
  });

  test('`$$[type]` returns a component instance of that type', () => {
    expect(item.$$[A.type]).toBeInstanceOf(A);
    expect(item.$$[B.type]).toBeInstanceOf(B);
    expect(item.$$[C.type]).toBeInstanceOf(C);
  });

  test('components returned with `$` are immutable', () => {
    // @ts-expect-error
    expect(() => (item.$[A.type].value = 'a')).toThrow();
  });

  test('components returned with `$$` are mutable', () => {
    expect(() => (item.$$[A.type].value = 'a')).not.toThrow();
    expect(item.$$[A.type].value).toEqual('a');
  });
});
