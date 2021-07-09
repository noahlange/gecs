import { describe, expect } from '@jest/globals';

import { Registry } from '../../lib';

describe('Registry', () => {
  describe('.add(), .remove(), .clear()', () => {
    test('add() adds to the registry and returns the union key', () => {
      const reg = new Registry();
      const res = reg.add('0', '1');
      expect(res.toString()).toBe('6');
    });

    test('getID', () => {
      const reg = new Registry();
      reg.add('0', '1');
      expect(reg.getID('1')?.toString()).toBe('4');
      expect(reg.getID('foobar')).toBeNull();
    });
  });
});
