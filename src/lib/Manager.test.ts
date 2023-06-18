import { describe, expect, test } from '@jest/globals';

import { getContext } from '../test/helpers';
import { A } from '../test/helpers/components';

describe('queries', () => {
  test('identical queries should be cached', () => {
    const ctx = getContext();
    const a = ctx.query.components(A).tags('A', 'B', 'C').query;
    const b = ctx.query.components(A).tags('A', 'B', 'C').query;

    expect(a).toBe(b);
  });
});
