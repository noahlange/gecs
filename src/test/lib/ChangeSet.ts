import { describe, expect } from '@jest/globals';

import { ChangeSet } from '../../lib';

describe('ChangeSet', () => {
  describe('.add(), .remove(), .clear()', () => {
    const set = new ChangeSet([]);

    test('add()', () => {
      set.add('1', '2', '1');
      expect(set.all()).toHaveLength(2);
    });

    test('remove()', () => {
      set.remove('1');
      expect(set.all()).toHaveLength(1);
    });

    test('clear()', () => {
      set.clear();
      expect(set.all()).toHaveLength(0);
    });
  });

  describe('onChange handler', () => {
    let calls = 0;
    const set = new ChangeSet([], () => calls++);

    set.add('1');
    expect(calls).toBe(1);

    set.add('1');
    expect(calls).toBe(1);

    set.remove('2');
    expect(calls).toBe(1);

    set.clear();
    expect(calls).toBe(2);
  });
});
