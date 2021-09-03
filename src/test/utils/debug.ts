import { describe, expect, test } from '@jest/globals';

import { debug, Entity, Manager } from '../../';
import { A, B } from '../helpers/components';

@debug.leak
class E extends Entity.with(A, B) {}

describe('debug tooling - leak decorator', () => {
  test('...should throw if accessed once destroyed', () => {
    const em = new Manager();
    const item = em.create(E);

    em.tick();
    // normal access
    expect(() => item.$).not.toThrow();

    item.destroy();
    em.tick();
    // 🚨 wee-oh, memory leak 🚨
    expect(() => item.$).toThrow();
  });
});
