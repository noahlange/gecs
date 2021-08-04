const bench = require('nanobench');
const { Test1, Test2, Test3 } = require('../helpers/components');
const { setupComplex } = require('../helpers/queries');

for (const count of [1, 10, 50, 100]) {
  bench(
    `query ${count}k entities (3 components, 3 tags, 2 steps x1 item)`,
    async b => {
      const ctx = await setupComplex(count, 1);
      b.start();
      ctx.query.components(Test1).tags('one').get();
      b.end();
      await ctx.stop();
    }
  );

  bench(
    `query ${count}k entities (3 components, 3 tags, 2 steps x2 items)`,
    async b => {
      const ctx = await setupComplex(count, 2);
      b.start();
      ctx.query.components(Test1, Test2).tags('one', 'two').get();
      b.end();
      await ctx.stop();
    }
  );

  bench(
    `query ${count}k entities (3 components, 3 tags, 2 x3 items)`,
    async b => {
      const ctx = await setupComplex(count, 3);
      b.start();
      ctx.query
        .components(Test1, Test2, Test3)
        .tags('one', 'two', 'three')
        .get();
      b.end();
      await ctx.stop();
    }
  );
}
