const bench = require('nanobench');
const { Context } = require('gecs');
const { Test1, Test2, Test3 } = require('../helpers/components');
const { E1, E2, E3 } = require('../helpers/entities');

const components = [Test1, Test2, Test3];
const entities = [E1, E2, E3];
const tags = ['one', 'two', 'three'];

async function setupComplex(create, i) {
  const E = entities[i - 1];

  const ctx = new Context();

  ctx.register(entities, components, tags);

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
  await ctx.tick();
  return ctx;
}

for (let count = 1; count <= 3; count++) {
  const c = components.slice(0, count);
  const t = tags.slice(0, count);

  bench(`building 1 step query - ${count} items`, async b => {
    const ctx = await setupComplex(10, 1);
    b.start();
    ctx.query.components(...c).query;
    b.end();
    await ctx.stop();
  });

  bench(`building 2 step query - ${count} items`, async b => {
    const ctx = await setupComplex(10, 1);
    b.start();
    ctx.query.components(...c).tags(...t).query;
    b.end();
    await ctx.stop();
  });
}
