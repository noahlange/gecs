import type { Entity } from '../..';
import type { OfOrPromiseOf } from '../../types';
import type { Identifier } from '../../types';

import { Context } from '../..';
import * as C from './components';
import { WithA, WithABC, WithAC, WithB } from './entities';
import * as E from './entities';

export function getContext(): Context<{}> {
  const ctx = new Context();
  const tags = ['a', 'b', 'c', 'MY_TAG', 'OTHER_TAG'];
  ctx.register(Object.values(E), Object.values(C), tags);
  return ctx;
}

export async function setup(): Promise<{
  ctx: Context<{}>;
  ids: Identifier[];
}> {
  const ctx = getContext();
  const entities: Entity[] = [];
  const count = 5;

  await withTick(ctx, () => {
    for (let i = 0; i < count; i++) {
      entities.push(
        ctx.create(WithA, {}, ['a']),
        ctx.create(WithB, {}, ['b']),
        ctx.create(WithAC, {}, ['a', 'c']),
        ctx.create(WithABC, {}, ['a', 'b', 'c'])
      );
    }
  });

  return { ctx, ids: entities.map(e => e.id) };
}

interface Tickable {
  tick(...args: any[]): OfOrPromiseOf<void>;
}

export async function withTick<T>(tickable: Tickable, callback: () => OfOrPromiseOf<T>): Promise<T> {
  await tickable.tick();
  const res = await callback();
  await tickable.tick();
  return res;
}