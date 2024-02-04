import { Context, EntityClass } from 'gecs';

import { E1, E2, E3 } from './entities';
const entities = [E1, E2, E3];

import c, { Test1, Test2, Test3 } from './components';
import e from './entities';
import t from './tags';

async function setup(create: number, components: number) {
  const E = entities[components - 1] as EntityClass;
  const ctx = new Context();

  ctx.register(e, c, t);

  for (let i = 0; i < create * 1000; i++) {
    const data: any = { test1: { a: 4, b: 5 } };
    if (components > 1) {
      data.test2 = { c: 6, d: 7 };
    }
    if (components > 2) {
      data.test3 = { e: 8, f: 9 };
    }
    ctx.create(E, data);
  }

  ctx.tick();
  return ctx;
}

async function setupComplex(create: number, components: number) {
  const E = entities[components - 1] as EntityClass<{ test1: Test1; test2: Test2; test3: Test3 }>;

  const ctx = new Context();
  ctx.register(e, c, t);
  for (let i = 0; i < create * 1000; i++) {
    ctx.create(
      E,
      {
        test1: { a: 4, b: 5 },
        test2: { c: 6, d: 7 },
        test3: { e: 8, f: 9 }
      },
      ['one', 'two', 'three']
    );
  }
  ctx.tick();
  return ctx;
}

async function setupTags(create: number, tags: number) {
  const tagList = Array.from({ length: tags }, (_, i) => `tag-${i}`);
  const ctx = new Context();
  ctx.register(e, c, t);
  for (let i = 0; i < create * 1000; i++) {
    ctx.create(E1, { test1: { a: 4, b: 5 } }, tagList);
  }
  ctx.tick();
  return ctx;
}

export { setup, setupComplex, setupTags };
