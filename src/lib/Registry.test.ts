import { describe, expect, test } from 'vitest';

import { Registry } from '.';

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
      expect(reg.getID('1')).toBe(4n);
      expect(reg.getID('foobar')).toBeNull();
    });
  });

  test('release() makes the key associated with an identifier available for reuse', () => {
    const reg = new Registry();
    reg.add('0', '1', '2'); // 2n, 4n, 8n
    reg.release('0');
    expect(reg.add('3')).toBe(2n);
  });
});
