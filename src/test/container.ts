/* eslint-disable max-classes-per-file */
import { test, describe, expect } from '@jest/globals';
import { Manager } from '../lib';

import { Item } from './helpers/containers';
import { A, B, C } from './helpers/containeds';

describe('creating containers', () => {
  const em = new Manager();
  const item = new Item(em);
  const keys = Object.keys(item.$);

  test('`Container.with()` adds additional items to the list of those attached to a newly-constructed container', () => {
    expect(item.items.length).toBe(3);
  });

  test('`$` returns all components', () => {
    expect(keys).toContain(A.type);
    expect(keys).toContain(B.type);
    expect(keys).toContain(C.type);
  });

  test('`$[type]` returns a component instance of that type', () => {
    expect(item.$[A.type]).toBeInstanceOf(A);
    expect(item.$[B.type]).toBeInstanceOf(B);
    expect(item.$[C.type]).toBeInstanceOf(C);
  });
});
