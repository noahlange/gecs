import { describe, expect, test } from '@jest/globals';

import { Entity, EntityRef } from '../ecs';
import { Manager as Manager } from '../lib';
import { WithABC } from './helpers/entities';

class RefABC extends EntityRef<WithABC> {
  public static readonly type = 'abc';
}

const WithRefABC = Entity.with(RefABC);

describe('entity refs', () => {
  const em = new Manager();

  test('initialize refs', () => {
    const abc = em.create(WithABC);
    const withRef = em.create(WithRefABC, { abc });
    expect(withRef.$.abc).toBe(abc);
  });

  test('destroy refs', () => {
    const abc = em.create(WithABC);
    const withRef = em.create(WithRefABC, { abc });
    abc.destroy();
    expect(withRef.$.abc).toBe(null);
  });

  test('reinitialize refs', () => {
    const abc = em.create(WithABC);
    const withRef = em.create(WithRefABC, {});
    withRef.$.abc = abc;
    expect(withRef.$.abc).toBe(abc);
  });
});
