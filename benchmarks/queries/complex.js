const bench = require('nanobench');
const { Test1, Test2, Test3 } = require('../helpers/components');
const { setupComplex } = require('../helpers/queries');

for (const count of [1, 10, 50, 100]) {
  bench(
    `query ${count}k entities (3 components, 3 tags, 2 steps x1 item)`,
    b => {
      const ctx = setupComplex(count, 1);
      b.start();
      ctx.$.components(Test1).all.tags('one').get();
      b.end();
    }
  );

  bench(
    `query ${count}k entities (3 components, 3 tags, 2 steps x2 items)`,
    b => {
      const ctx = setupComplex(count, 2);
      b.start();
      ctx.$.components(Test1, Test2).all.tags('one', 'two').get();
      b.end();
    }
  );

  bench(`query ${count}k entities (3 components, 3 tags, 2 x3 items)`, b => {
    const ctx = setupComplex(count, 3);
    b.start();
    ctx.$.components(Test1, Test2, Test3).all.tags('one', 'two', 'three').get();
    b.end();
  });
}
