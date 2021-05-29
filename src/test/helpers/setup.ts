import type { Entity } from '../../ecs';

import { Manager } from '../../lib';
import { WithA, WithABC, WithAC, WithB } from './entities';
import { withTick } from './utils';

export async function setup(): Promise<{ em: Manager; ids: string[] }> {
  const em = new Manager();
  const entities: Entity[] = [];
  const count = 5;

  await withTick(em, () => {
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
