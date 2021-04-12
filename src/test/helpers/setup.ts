import type { Entity } from '../../ecs';
import { EntityManager } from '../../managers';

import { WithA, WithAC, WithABC, WithB } from './entities';
import { withTick } from './utils';

export function setup(): { em: EntityManager; ids: string[] } {
  const em = new EntityManager();
  const entities: Entity[] = [];
  const count = 5;

  withTick(em, () => {
    for (let i = 0; i < count; i++) {
      entities.push(
        em.create(WithA, {}, ['a']),
        em.create(WithB, {}, ['b']),
        em.create(WithAC, {}, ['a', 'c']),
        em.create(WithABC, {}, ['a', 'b', 'c'])
      );
    }
  });

  return { em, ids: entities.map(e => e.id) };
}
