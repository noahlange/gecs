const bench = require('nanobench');
const { Test1, Test2, Test3 } = require('../helpers/components');
const { setup } = require('../helpers/queries');

for (const count of [1, 10, 50, 100]) {
  bench(`query ${count}k entities (1 component)`, async b => {
    const ctx = await setup(count, 1);
    b.start();
    ctx.query.components(Test3).get();
    b.end();
    await ctx.stop();
  });

  bench(`query ${count}k entities (2 components)`, async b => {
    const ctx = await setup(count, 2);
    b.start();
    ctx.query.components(Test1, Test2).get();
    b.end();
    await ctx.stop();
  });

  bench(`query ${count}k entities (3 components)`, async b => {
    const ctx = await setup(count, 3);
    b.start();
    ctx.query.components(Test1, Test2, Test3).get();
    b.end();
    await ctx.stop();
  });
}
