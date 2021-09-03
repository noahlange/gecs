import type { Entity, Manager } from '../../';
import type { Identifier } from '../../types';

import { Context } from '../../';
import * as C from './components';
import { WithA, WithABC, WithAC, WithB } from './entities';
import * as E from './entities';
import { withTick } from './utils';

export function getContext(): Context<{}> {
  const ctx = new Context();
  const tags = ['a', 'b', 'c', 'MY_TAG', 'OTHER_TAG'];
  ctx.register(Object.values(E), Object.values(C), tags);
  return ctx;
}

export async function setup(): Promise<{
  ctx: Context<{}>;
  em: Manager;
  ids: Identifier[];
}> {
  const ctx = getContext();
  const entities: Entity[] = [];
  const count = 5;
  const em = ctx.manager;

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

  return { ctx, em, ids: entities.map(e => e.id) };
}
