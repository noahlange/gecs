import { describe, expect, test } from 'vitest';

import { getContext } from './helpers';
import { WithABC } from './helpers/entities';

describe('tagging entities', () => {
  const ctx = getContext();
  const item = ctx.create(WithABC, { a: { value: '???' } }, ['MY_TAG']);

  test('create() with tags', () => {
    expect(item.tags.has('MY_TAG')).toBeTruthy();
  });

  test('has() container tags', () => {
    expect(item.tags.has('MY_OTHER_TAG')).toBeFalsy();
  });

  test('add() container tags', () => {
    item.tags.add('MY_OTHER_TAG');
    expect(item.tags.has('MY_OTHER_TAG')).toBeTruthy();
  });

  test('remove() container tags', () => {
    item.tags.remove('MY_TAG');
    expect(item.tags.has('MY_TAG')).toBeFalsy();
  });
});
