import { describe, expect, test } from '@jest/globals';

import { Entity, EntityRef } from '../ecs';
import { Manager } from '../lib';
import { WithABC } from './helpers/entities';

class RefABC extends EntityRef<WithABC> {
  public static readonly type = 'abc';
}

describe('entity references', () => {
  const WithRefABC = Entity.with(RefABC);

  test('...can be set on entity creation', () => {
    const em = new Manager();
    const abc = em.create(WithABC);
    const withRef = em.create(WithRefABC, { abc });
    expect(withRef.$.abc).toBe(abc);
  });

  test('...can be set at runtime', () => {
    const em = new Manager();
    const abc = em.create(WithABC);
    const withRef = em.create(WithRefABC, {});
    withRef.$.abc = abc;
    expect(withRef.$.abc).toBe(abc);
  });

  test('...to destroyed entities should be nullified', () => {
    const em = new Manager();
    const abc = em.create(WithABC);
    const withRef = em.create(WithRefABC, { abc });
    abc.destroy();
    expect(withRef.$.abc).toBeNull();
  });
});
