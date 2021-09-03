import { describe, expect, test } from '@jest/globals';

import { getID } from '../../utils';
import { releaseID } from '../../utils/ids';

describe('id generation', () => {
  test('default strategy should be incrementing numberic IDs', () => {
    const ids = [];
    for (let x = 1; x < 5; x++) {
      ids.push(getID());
    }

    expect(ids).toEqual([1, 2, 3, 4]);
  });

  test('released IDs should be returned instead of new ones', () => {
    const ids = [];
    for (let x = 1; x < 5; x++) {
      ids.push(getID());
    }

    releaseID(1);
    ids.push(getID());

    expect(ids).toEqual([5, 6, 7, 8, 1]);
  });
});
