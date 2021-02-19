import { test, describe, expect } from '@jest/globals';
import { EntityManager as Manager } from '../managers';

import { WithABC } from './helpers/entities';

describe('tagging entities', () => {
  const em = new Manager();
  const item = em.create(WithABC, { a: { value: '???' } }, ['awesome']);

  test('create() with tags', () => {
    expect(item.tags.has('awesome')).toBeTruthy();
  });

  test('has() container tags', () => {
    expect(item.tags.has('foo')).toBeFalsy();
  });

  test('add() container tags', () => {
    item.tags.add('foo');
    expect(item.tags.has('foo')).toBeTruthy();
  });

  test('remove() container tags', () => {
    item.tags.remove('foo');
    expect(item.tags.has('foo')).toBeFalsy();
  });
});
