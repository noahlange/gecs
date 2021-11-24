import { describe, expect, test } from '@jest/globals';

import { debug, Entity } from '../../';
import { A, B } from '../helpers/components';
import { getContext } from '../helpers/setup';

@debug.leak
class E extends Entity.with(A, B) {}

describe('debug tooling - leak decorator', () => {
  test('...should throw if accessed once destroyed', () => {
    const ctx = getContext();
    const item = ctx.create(E);

    ctx.tick(0);
    // normal access
    expect(() => item.$).not.toThrow();

    item.destroy();
    ctx.tick(0);
    // 🚨 wee-oh, memory leak 🚨
    expect(() => item.$).toThrow();
  });
});
