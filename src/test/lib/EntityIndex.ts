import { describe, expect } from '@jest/globals';

import { Manager } from '../../lib';
import { WithA } from '../helpers/entities';

describe('Registry', () => {
  test('remove deletes an entity', () => {
    const m = new Manager();
    const e = m.create(WithA);
    m.tick();
    e.destroy();
    m.tick();

    expect(m.index.all()).toHaveLength(0);
  });
});
